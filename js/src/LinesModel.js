/* Copyright 2015 Bloomberg Finance L.P.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var d3 = require("d3");
var _ = require("underscore");
var markmodel = require("./MarkModel");

var LinesModel = markmodel.MarkModel.extend({

    defaults: function () {
        return _.extend(markmodel.MarkModel.prototype.defaults(), {
            _model_name: "LinesModel",
            _view_name: "Lines",
            x: [],
            y: [],
            color: null,
            scales_metadata: {
                x: { orientation: "horizontal", dimension: "x" },
                y: { orientation: "vertical", dimension: "y" },
                color: { dimension: "color" }
            },
            colors: d3.scale.category10().range(),
            fill_colors: d3.scale.category10().range(),
            stroke_width: 2.0,
            labels_visibility: "none",
            curves_subset: [],
            line_style: "solid",
            interpolation: "linear",
            close_path: false,
            fill: "none",
            marker: null,
            marker_size: 64,
            opacities: [],
            fill_opacities: []
        });
    },

    initialize: function() {
        LinesModel.__super__.initialize.apply(this, arguments);
        this.on_some_change(["x", "y", "color"], this.update_data, this);
        this.on("change:labels", this.update_labels, this);
        // FIXME: replace this with on("change:preserve_domain"). It is not done here because
        // on_some_change depends on the GLOBAL backbone on("change") handler which
        // is called AFTER the specific handlers on("change:foobar") and we make that
        // assumption.
        this.on_some_change(["preserve_domain"], this.update_domains, this);
        this.update_data();
        this.update_domains();
    },

    update_data: function() {
        this.dirty = true;
        // Handling data updates
        var that = this;
        this.x_data = this.get_typed_field("x");
        this.y_data = this.get_typed_field("y");
        this.color_data = this.get_typed_field("color");

        var scales = this.get("scales");
        var x_scale = scales.x, y_scale = scales.y;
        var curve_labels = this.get("labels");
        if (this.x_data.length === 0 || this.y_data.length === 0) {
            this.mark_data = [];
        } else {
            this.x_data = this.x_data[0] instanceof Array ?
                this.x_data : [this.x_data];
            this.y_data = this.y_data[0] instanceof Array ?
                this.y_data : [this.y_data];
            curve_labels = this.get_labels();

            if (this.x_data.length == 1 && this.y_data.length > 1) {
                // same x for all y
                this.mark_data = curve_labels.map(function(name, i) {
                    return {
                        name: name,
                        values: that.y_data[i].map(function(d, j) {
                            return {x: that.x_data[0][j], y: d,
                                    sub_index: j};
                        }),
                        color: that.color_data[i],
                        index: i,
                    };
                });
            } else {
                this.mark_data = curve_labels.map(function(name, i) {
                    var xy_data = d3.zip(that.x_data[i], that.y_data[i]);
                    return {
                        name: name,
                        values: xy_data.map(function(d, j) {
                            return {x: d[0], y: d[1], sub_index: j};
                        }),
                        color: that.color_data[i],
                        index: i,
                    };
                });
            }
        }
        this.update_domains();
        this.dirty = false;
        this.trigger("data_updated");
    },

    update_labels: function() {
        // update the names in mark_data
        var labels = this.get_labels();
        this.mark_data.forEach(function(element, i) {
            element.name = labels[i];
        });
        this.trigger("labels_updated");
    },

    get_labels: function() {
        // Function to set the labels appropriately.
        // Setting the labels to the value sent and filling in the
        // remaining values.
        var curve_labels = this.get("labels");
        var data_length = (this.x_data.length == 1) ?
            (this.y_data.length) : Math.min(this.x_data.length, this.y_data.length);
        if(curve_labels.length > data_length) {
            curve_labels = curve_labels.slice(0, data_length);
        }
        else if(curve_labels.length < data_length) {
            _.range(curve_labels.length, data_length).forEach(function(index) {
                curve_labels[index] = "C" + (index+1);
            });
        }
        return curve_labels;
    },

    update_domains: function() {
        if(!this.mark_data) {
            return;
        }
        var scales = this.get("scales");
        var x_scale = scales.x, y_scale = scales.y;
        var color_scale = scales.color;

        if(!this.get("preserve_domain").x) {
            x_scale.compute_and_set_domain(this.mark_data.map(function(elem) {
                return elem.values.map(function(d) { return d.x; });
            }), this.model_id + "_x");
        } else {
            x_scale.del_domain([], this.model_id + "_x");
        }

        if(!this.get("preserve_domain").y) {
            y_scale.compute_and_set_domain(this.mark_data.map(function(elem) {
                return elem.values.map(function(d) { return d.y; });
            }), this.model_id + "_y");
        } else {
            y_scale.del_domain([], this.model_id + "_y");
        }
        if(color_scale !== null && color_scale !== undefined) {
            if(!this.get("preserve_domain").color) {
                color_scale.compute_and_set_domain(this.mark_data.map(function(elem) {
                    return elem.color;
                }), this.model_id + "_color");
            } else {
                color_scale.del_domain([], this.model_id + "_color");
            }
        }
    },

    get_data_dict: function(data, index) {
        return data;
    },
});

var FlexLineModel = LinesModel.extend({

    defaults: function() {
        return _.extend(LinesModel.prototype.defaults(), {
            _model_name: "FlexLineModel",
            _view_name: "FlexLine",

            x: [],
            y: [],
            color: null,
            scales_metadata: {
                x: { orientation: "horizontal", dimension: "x" },
                y: { orientation: "vertical", dimension: "y" },
                color: { dimension: "color" }
            },
            colors: d3.scale.category10().range(),
            fill_colors: d3.scale.category10().range(),
            stroke_width: 2.0,
            labels_visibility: "none",
            curves_subset: [],
            line_style: "solid",
            interpolation: "linear",
            close_path: false,
            fill: "none",
            marker: null,
            marker_size: 64,
            opacities: [],
            fill_opacities: [],
        });
    },

    update_data: function() {
        this.dirty = true;
        // Handling data updates
        var that = this;
        this.x_data = this.get_typed_field("x");
        this.y_data = this.get_typed_field("y");

        var scales = this.get("scales");
        var x_scale = scales.x, y_scale = scales.y;
        var curve_labels = this.get("labels");
        if (this.x_data.length === 0 || this.y_data.length === 0) {
            this.mark_data = [];
            this.data_len = 0;
        } else {
            this.x_data = this.x_data[0] instanceof Array ?
                this.x_data : [this.x_data];
            this.y_data = this.y_data[0] instanceof Array ?
                this.y_data : [this.y_data];
            curve_labels = this.get_labels();
            var color_data = this.get_typed_field("color");
            var width_data = this.get_typed_field("width");
            this.data_len = Math.min(this.x_data[0].length, this.y_data[0].length);

            this.mark_data = [{
                name: curve_labels[0],
                values: _.range(this.data_len - 1).map(function(val, index) {
                    return {
                        x1: that.x_data[0][index],
                        y1: that.y_data[0][index],
                        x2: that.x_data[0][index + 1],
                        y2: that.y_data[0][index + 1],
                        color: color_data[index],
                        size: width_data[index]
                    };
                })
            }];
        }

        this.update_domains();
        this.dirty = false;
        this.trigger("data_updated");
    },

    update_domains: function() {
        if(!this.mark_data) {
            return;
        }
        var scales = this.get("scales");
        var x_scale = scales.x, y_scale = scales.y;
        var color_scale = scales.color;
        var width_scale = scales.width;

        if(!this.get("preserve_domain").x) {
            x_scale.compute_and_set_domain(this.x_data[0].slice(0, this.data_len), this.model_id + "_x");
        } else {
            x_scale.del_domain([], this.model_id + "_x");
        }

        if(!this.get("preserve_domain").y) {
            y_scale.compute_and_set_domain(this.y_data[0].slice(0, this.data_len), this.model_id + "_y");
        } else {
            y_scale.del_domain([], this.model_id + "_y");
        }

        if(color_scale !== null && color_scale !== undefined) {
            if(!this.get("preserve_domain").color) {
                color_scale.compute_and_set_domain(this.mark_data.map(function(elem) {
                    return elem.values.map(function(d) {
                        return d.color;
                    });
                }), this.model_id + "_color");
            } else {
                color_scale.del_domain([], this.model_id + "_color");
            }
        }
        if(width_scale !== null && width_scale !== undefined) {
            if(!this.get("preserve_domain").width) {
                width_scale.compute_and_set_domain(this.mark_data.map(function(elem) {
                    return elem.values.map(function(d) {
                        return d.size;
                    });
                }), this.model_id + "_width");
            } else {
                width_scale.del_domain([], this.model_id + "_width");
            }
        }
    }
});

module.exports = {
    LinesModel: LinesModel,
    FlexLineModel: FlexLineModel
};
