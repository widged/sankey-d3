define(["sankeylayout"], function(SankeyLayout){

    var PV = PrivateFunctions(), FN = PureFunctions();

    // ###################################
    //  Instance generator
    // ###################################

    var Class = function Sankey() {
        
        var instance = this,
            state = {},
            rootNode,
            sankey;

        instance.load = function(obj) {
            state = PV.loadState(obj, PV.defaultSettings);
            if(obj && obj.data && obj.data.watch) {
                obj.data.watch(setChartData);
            }
            setChartData(obj.data);
            return instance;
        };

        instance.mountIn = function(node) {
            rootNode = node;
            draw();
            actuate();
            return {contents: "", sheets: ["/css/sankey.css"]};
        };

        function setChartData(data) {
            var d = data.get ? data.get() : data;
            state = PV.setChartData(state, d);
            draw();
            actuate();
        }

        function draw() {
            sankey = PV.draw(rootNode, state);
        }

        function actuate() {
            PV.actuate(rootNode, sankey, state);
        }
    };

    // ###################################
    //  Static functions and variables
    // ###################################

    /**
        Convert a list of data into a sankey dataProvider. 
        @param rows A list of items, with each item of the form ["left", "right", 4] 
        @return sankey data.
    */
    Class.convertList = FN.convertList;

    // ###################################
    //  Flyweight pattern
    // ###################################

    function PrivateFunctions() {
        var PV = {};

        PV.defaultSettings = {
            margin: {top: 6, right: 1, bottom: 6, left: 1},
            width: 940,
            height: 500,
            color: d3.scale.category20()
        };

        PV.loadState = function(data, defaults) {
            var out = {};
            if(!data) { data = {}; }
            out.nodes = data.nodes;
            out.links = data.links;
            out.width = data.width || defaults.width;
            out.height = data.height || defaults.height;
            out.color = data.color || defaults.color;
            out.margin = data.margin || defaults.margin;
            return out;
        };

        PV.setChartData = function(state, data) {
            if(!data) { data = {}; }
            state.nodes = data.nodes;
            state.links = data.links;
            return state;
        };

        PV.draw = function(rootNode, state) {
            var nodes = state.nodes,
                links = state.links,
                nodeW = state.width,
                nodeH = state.height,
                margin = state.margin;

            var percentage = d3.format('.2%');

            if(!nodes || !links) { return; }

            var frameW = nodeW - margin.left - margin.right,
                frameH = nodeH - margin.top - margin.bottom;


            var root = d3.select(rootNode);

            var svg = root.append("svg")
                .attr("width", nodeW)
                .attr("height", nodeH)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            var sankey = SankeyLayout()
                .nodeWidth(15)
                .size([frameW, frameH]);

            sankey.nodes(nodes).links(links).layout(1);

            sankey
                .nodes(nodes)
                .links(links)
                .layout(1);

            var path = sankey.link();

            var link = svg.append("g").selectAll(".link")
                .data(links)
                .enter().append("path")
                .attr("class", "link")
                .attr("d", path)
                .style("stroke-width", function (d) {
                    return Math.max(1, d.dy);
                })
                .sort(function (a, b) {
                    return b.dy - a.dy;
                });

            link.append("title")
                .text(function (d) {
                    return '"' + d.source.name + '" → "' + d.target.name + '"\n' + d.value + " answers (" + percentage(d.value / d.source.value) + ")";
                });

            var nodeG = svg.append("g").selectAll(".node").data(nodes);

            var node = nodeG.enter().append("g")
                .attr("class", "node")
                .attr("transform", function (d) {
                    return "translate(" + d.x + "," + d.y + ")";
                });


            node.append("rect")
                .attr("height", function (d) {
                    return d.dy;
                })
                .attr("width", sankey.nodeWidth())
                .style("fill", function (d) { d.color = state.color(d.name.replace(/ .*/, "")); return d.color; })
                .style("stroke", function (d) {
                    return d3.rgb(d.color).darker(2);
                })
                .append("title")
                .text(function (d) {
                    return '"' + d.name + '"\n' + d.value + ' answers';
                });

            node.append("text")
                .attr("x", -6)
                .attr("y", function (d) {
                    return d.dy / 2;
                })
                .attr("dy", ".35em")
                .attr("text-anchor", "end")
                .attr("transform", null)
                .text(function (d) {
                    return d.name;
                })
                .filter(function (d) {
                    return d.x < frameW / 2;
                })
                .attr("x", 6 + sankey.nodeWidth())
                .attr("text-anchor", "start");

            return sankey;
        };

        PV.actuate = function(rootNode, sankey, state) {

            var root = d3.select(rootNode);
            var node = root.selectAll(".node");
            var nodeH = state.height;
            var link = root.selectAll(".link");
            
            var dragmove = function(d) {
                var that = this;
                var path = sankey.link();
                d3.select(that).attr("transform", "translate(" + d.x + "," + (d.y = Math.max(0, Math.min(nodeH - d.dy, d3.event.y))) + ")");
                sankey.relayout();
                link.attr("d", path);
            };

            var drag = d3.behavior.drag()
                .origin(function (d) { return d; })
                .on("dragstart", function () {
                    this.parentNode.appendChild(this);
                })
                .on("drag", dragmove);

            drag.apply(node);

        };

        return PV;

    }

    function PureFunctions() {
        var FN = {};

        FN.convertList = function(rows) {

            var data = {nodes: [], links: []};
            var links = [];
            rows.forEach(function(item) {
                var row = item;
                var key = [row[0],row[1]].join("::");
                if(!links.hasOwnProperty(key)) { links[key] = 0; }
                links[key] += row[2];
            });

            var nodeDict = [], nodes = [];
            Object.keys(links).forEach(function(key) {
                var parts = key.split("::");
                var d1 = parts[0];
                var d2 = parts[1];
                var n = links[key] || 0;
                var i1 = getIndex(nodeDict, "1-"+d1); data.nodes[i1] = {name: d1};
                var i2 = getIndex(nodeDict, "2-"+d2); data.nodes[i2] = {name: d2};
                data.links.push({"source":i1,"target":i2,"value":n});
            });


            function getIndex(dict, d) {
                var idx = dict.indexOf(d);
                if(idx === -1) { idx = dict.length; dict.push(d); }
                return idx;
            }
            return data;
        };

        return FN;
    }

    return Class;
});
