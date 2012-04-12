(function () {
    var schema = {
        properties: {
            target: {
                type: 'string',
                required: true
            },
            width: {
                type: 'integer'
            },
            height: {
                type: 'integer'
            },
            radius: {
                type: 'integer'
            },
            data: {
                description: "list of 2-tuple of string, float",
                required: true,
                type: 'array',
                items: {
                    type: 'array',
                    minItems: 2,
                    maxItems: 2,
                    items: {
                        type: ['number', 'string']
                    }
                }
            }
        }
    };
    Iris.Renderer.create({
        about: function() {
            return {
                name: "piechart",
                author: "Tobias Paczian",
                version: "1.0",
                requires: ['d3.js', 'd3.geom.min.js', 'd3.layout.min.js'],
                options: {
                    'width': 600,
                    'height': 600,
                    'radius': 290,
                    'target': 'pie_space',
                    'data': 'example_data()'
                },
                classes: [],
                data_format: schema.properties.data.description
            }
        },
        example_data: function() {
            return [["slice a", 20], ["slice b", 30], ["slice c", 25], ["slice d", 5]];
        },
        render: function(settings) {

            var options = {
                width: 500,
                height: 500,
                radius: 245,
                target: "pie_space",
                data: []
            };
            $.extend(options, settings);

            var opt = options;

            var check = window.json.validate(opt, schema);
            if (!check['valid']) {
                $.error(check['errors']);
            }

            var target = document.getElementById(options.target);
            target.innerHTML = "";


            target.onclick = function() {
                if (fb_dragData) {
                    opt.data = fb_dragData;
                    $('div').RendererPiechart.render(opt);
                    fb_dragData = null;
                }
            }

            var w = options.width;
            var h = options.height;
            var r = options.radius;
            var color = d3.scale.category20c();

            var data = [];
            for (i = 0; i < options.data.length; i++) {
                data.push({
                    "label": options.data[i][0] + " (" + options.data[i][1] + ")",
                    "value": options.data[i][1]
                });
            }

            var vis = d3.select(document.getElementById(options.target)).append("svg:svg").data([data]).attr("width", w).attr("height", h).append("svg:g").attr("transform", "translate(" + r + "," + r + ")");

            var arc = d3.svg.arc().outerRadius(r);

            var pie = d3.layout.pie().value(function(d) {
                return d.value;
            });

            var arcs = vis.selectAll("g.slice").data(pie).enter().append("svg:g").attr("class", "slice");

            arcs.append("svg:path").attr("fill", function(d, i) {
                return color(i);
            }).attr("d", arc);

            arcs.append("svg:text").attr("transform", function(d) {
                d.innerRadius = 0;
                d.outerRadius = r;
                return "translate(" + arc.centroid(d) + ")";
            }).attr("text-anchor", "middle").text(function(d, i) {
                return data[i].label;
            });
        }
    });
}).call(this);
