require([
    'jquery',
    'backbone',
    'underscore',
    'charts/bar',
    'charts/pie',
    'renderers/table',
    'util/viewport',
    'util/dropdown'
], function (JQ, Backbone, _, BarChart, PieChart, Table, Viewport, DropDown) {
    var Genome = Backbone.Model.extend({
        defaults: { name: "" },
        urlRoot: "/data/genome",
        parse: function (data) {
            var contigs = {};
            for (var id in data.contigs) {
                    var len = parseInt(data.contigs[id].length);
                if (len > 1e6) {
                    contigs[data.contigs[id].name] = len;
                }
            }
            this.set('name',    data.info["scientific_name"]);
            this.set('genes',   data.info["pegs"]);
            this.set('length',  data.info["dna_size"]);
            this.set('contigs', contigs);
        }
    });

    var dropdownFactory = new DropDown({
        container: "#nav-content",
        copyTarget: "#genome-name"
    });
    var dropdown = dropdownFactory.create({
        name: "Genome",
        url: "/data/genome",
        listParse: function (response) {
            return response.result;
        }
    }).fetch();
    
    var ChartView = Backbone.View.extend({
        initialize: function () {
            _.bindAll(this, 'render');
            this.model.on('sync', this.render);
        },
        dataSpec: function (data) { return data; },
        render: function () {
            this.$el.empty();
            var chartData = [];
            var contigs = this.model.get('contigs');
            for (var chr in contigs) {
                chartData.push(this.dataPoint(contigs, chr));
            }
            var vis = new this.chartType({ element: this.$el });
            vis.setData(this.dataSpec(chartData));
            vis.render();
            this.viewport.renderer(vis);
            return this;
        },
    });
    
    var charts = {
        barchart: {
            title: "Bar Chart",
            dataPoint: function (contigs, id) {
                return { x: id, y: contigs[id] }
            },
            chartType: BarChart
        },
        piechart: {
            title: "Pie Chart",
            dataPoint: function (contigs, id) {
                return [id, contigs[id]]
            },
            chartType: PieChart
        },
        tablesum: {
            title: "Table",
            dataPoint: function (contigs, id) { return [ id, contigs[id] ] },
            chartType: Table,
            dataSpec: function (data) {
                return {
                    data: data,
                    columns: ['Contig', 'Length'],
                    filter: ['Contig']
                }
            }
        }
    }

    var Router = Backbone.Router.extend({
        routes: {
            "*actions": "show"
        },
        show: function (genomeId) {
            JQ("#datavis").empty();
            var row = JQ("<div>").addClass("row");
            JQ("#datavis").append(row);
            var genome = new Genome;
            genomeId = genomeId || 'kb|g.3899';
            genome.set({ id: genomeId });
            dropdown.select(genomeId);
            for (var elementId in charts) {
                var wrapper = JQ("<div>").addClass("col-md-4");
                row.append(wrapper);
                var viewport = new Viewport({
                    parent: wrapper,
                    height: 400,
                    title: charts[elementId].title,
                    sortContainer: row
                });
                var View = ChartView.extend(charts[elementId]);
                var view = new View({
                    model: genome,
                    el: viewport
                });
                view.viewport = viewport;
            }
            genome.fetch({
                success: function (model, json) {
                JQ("#genome-name").text(json.info["scientific_name"]);
                JQ("#genome-info").empty();
                JQ("#genome-info")
                    .append(JQ("<small>").html(json.info["dna_size"] + " bp"))
                    .append(JQ("<small>").html(json.info["pegs"] + " genes"))
                },
                error: function (model, xhr) {
                    var content = JQ("<span>");
                    if (xhr.status == 404) {
                        content.append(JSON.parse(xhr.responseText).error);
                    } else {
                        content
                            .append(JQ("<p>")
                                .text("Couldn't get genome " + model.get('id'))
                            )
                            .append(JQ("<h5>").text("Technical details"))
                            .append(JQ("<pre>").css("font-size", "65%")
                                .text(xhr.responseText));
                    }
                    JQ("#datavis").empty().prepend(
                        JQ("<div>").addClass("alert alert-block alert-error")
                            .css("margin-top", "50px")
                            .append(JQ("<h3>").text("Oops!")).append(content)
                    );
                }
            });
        },
    });
    
    JQ("#datavis").before("<h2 id=\"genome-name\"></h2>")
    JQ("#datavis").before("<div id=\"genome-info\"></div>");
    var router = new Router;
    Backbone.history.start();
});