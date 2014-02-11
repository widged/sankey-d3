define(["d3"], function(d3) {

    var PV = PrivateFN(), FN = PureFN(), Node = NodeFN(), Link = LinkFN();

    var Class = {};

    /**
        SankeyLayout

        @credits: 
            Adapted from: https://github.com/d3/d3-plugins/blob/master/sankey/sankey.js
            Copyright (c) 2013, Michael Bostock. All Rights Reserved. See https://github.com/d3/d3-plugins/blob/master/LICENSE
            Changed by Marielle Lange to use a flyweight pattern in order to minimise the amount of data copied in each closure
        @changes
            functions moved to a NodeFN, LinkFN, or NodeListFN scope. 
            reorganized code in a more functional way 
    */
    Class = function SankeyLayout() {

        var instance = this,
            nodeWidth = 24,
            nodePadding = 8,
            size = [1, 1],
            nodes = [],
            links = [];

        instance.nodeWidth = function(_) {
            if (!arguments.length) return nodeWidth;
            nodeWidth = +_;
            return instance;
        };

        instance.nodePadding = function(_) {
            if (!arguments.length) return nodePadding;
            nodePadding = +_;
            return instance;
        };

        instance.nodes = function(_) {
            if (!arguments.length) return nodes;
            nodes = _;
            return instance;
        };

        instance.links = function(_) {
            if (!arguments.length) return links;
            links = _;
            return instance;
        };

        instance.size = function(_) {
            if (!arguments.length) return size;
            size = _;
            return instance;
        };

        instance.layout = function(iterations) {
            PV.initialize(nodes, links, size, nodeWidth, nodePadding, iterations);
            PV.relayout(nodes);
            instance.relayout();
            return instance;
        };

        instance.relayout = function() {
            PV.relayout(nodes);
            return instance;
        };

        instance.link = function() {
            return Link({curvature: 0.5});
        };

        return instance;
    };

    // ###################################
    //  Flyweight pattern
    // ###################################

    function PrivateFN() {

        var PV = {};

        PV.initialize = function(nodes, links, size, nodeWidth, nodePadding, iterations) {
            nodes.forEach(Node.resetLinks);
            links.forEach(Link.addNodeLinks(nodes));
            nodes.forEach(Node.addValues());
            PV.addNodeBreadths(nodes, size, nodeWidth);
            PV.addNodeDepths(nodes, links, size, nodePadding, iterations);
        };

        PV.relayout = function(nodes) {
            nodes.map(Node.sortLinks).map(Node.updateLinksDepths);
        };

        /**
            Iteratively assign the breadth (x-position) for each node.
            Nodes are assigned the maximum breadth of incoming neighbors plus one;
            nodes with no incoming links are assigned breadth zero, while
            nodes with no outgoing links are assigned the maximum breadth.
        */
        PV.addNodeBreadths = function(nodes, size, nodeWidth) {
            var remainingNodes = nodes,
                nextNodes,
                x = 0;

            while (remainingNodes.length) {
                nextNodes = [];
                remainingNodes.forEach(addRemaining);
                remainingNodes = nextNodes;
                ++x;
            }

            function addRemaining(node) {
                node.x = x;
                node.dx = nodeWidth;
                node.sourceLinks.forEach(function(link) {
                    nextNodes.push(link.target);
                });
            }

            var sinksRight = FN.moveSinksRight(x);
            var scaleNodeBreadths = FN.scaleNodeBreadths((size[0] - nodeWidth) / (x - 1));
            nodes.map(sinksRight).map(scaleNodeBreadths);
        };

        PV.addNodeDepths = function(nodes, links, size, nodePadding, iterations) {
            var nodesByBreadth = d3.nest()
                .key(function(d) { return d.x; })
                .sortKeys(d3.ascending)
                .entries(nodes)
                .map(function(d) { return d.values; });


            var ky = d3.min(nodesByBreadth, function(nodes) {
                return (size[1] - (nodes.length - 1) * nodePadding) / d3.sum(nodes, Link.getValue);
            });
            nodesByBreadth.forEach(FN.initializeDepth(ky));
            links.forEach(Link.initializeDepth(ky));

            var resolveCollisions = FN.resolveCollisions(size, nodePadding);
            nodesByBreadth.forEach(resolveCollisions);

            for (var alpha = 1; iterations > 0; --iterations) {
                var relaxToLeft = FN.relax(alpha *= 0.99, Node.getSourceLinks, Link.targetWeight, Link.getValue, FN.center);
                var relaxToRight = FN.relax(alpha,        Node.getTargetLinks, Link.sourceWeight, Link.getValue, FN.center);

                nodesByBreadth.slice().reverse().forEach(relaxToLeft);
                nodesByBreadth.forEach(resolveCollisions);
                nodesByBreadth.forEach(relaxToRight);
                nodesByBreadth.forEach(resolveCollisions);
            }
        };

        return PV;
    }

    function PureFN() {
        var FN = {};
        
        FN.relax = function(alpha, getLinks, weightedLink, getValue, getCenter) {
            var relax = Node.relax(alpha, getLinks, weightedLink, getValue, getCenter);
            return function(nodes) {
                nodes.forEach(relax);
                return nodes;
            };
        };


        FN.initializeDepth = function(ky) {
            return function(nodes) {
                nodes.forEach(Node.initializeDepth(ky));
                return nodes;
            };
        };


        FN.moveSinksRight = function(x) {
            return function(node) {
                if (!node.sourceLinks.length) {
                    node.x = x - 1;
                }
                return node;
            };
        };

        FN.moveSourcesRight = function() {
            return function(node) {
                if (!node.targetLinks.length) {
                    node.x = d3.min(node.sourceLinks, function(d) { return d.target.x; }) - 1;
                }
            };
        };

        FN.scaleNodeBreadths = function(kx) {
            return function(node) {
                node.x *= kx;
                return node;
            };
        };

        FN.resolveCollisions = function(size, nodePadding) {

            return function(nodes) {
                var node,
                    dy,
                    y0 = 0,
                    n = nodes.length,
                    i;

                // Push any overlapping nodes down.
                var getY = function(node) { return node.y; };
                nodes.sort(FN.ascendingNumerical(getY));
                for (i = 0; i < n; ++i) {
                    node = nodes[i];
                    dy = y0 - node.y;
                    if (dy > 0) node.y += dy;
                    y0 = node.y + node.dy + nodePadding;
                }

                // If the bottommost node goes outside the bounds, push it back up.
                dy = y0 - nodePadding - size[1];
                if (dy > 0) {
                    y0 = node.y -= dy;

                    // Push any overlapping nodes back up.
                    for (i = n - 2; i >= 0; --i) {
                        node = nodes[i];
                        dy = node.y + node.dy + nodePadding - y0;
                        if (dy > 0) node.y -= dy;
                        y0 = node.y;
                    }
                }
            };
        };

        FN.center = function(node) {
            return node.y + node.dy / 2;
        };


        FN.ascendingNumerical = function(getValue) {
            return function(a, b) {
                return getValue(a) - getValue(b);
            };
        };

        return FN;
    }

    // -----------------------------------
    //  Node
    // -----------------------------------

    function NodeFN() {
        var Class = {};

        /**
            Populate the sourceLinks and targetLinks for each node.
            Also, if the source and target are not objects, assume they are indices.
         */
        Class.resetLinks = function(node) {
            node.sourceLinks = [];
            node.targetLinks = [];
            return node;
        };

        /**
            Compute the value (size) of each node by summing the associated links.
         */
        Class.addValues = function() {
            return function(node) {
                node.value = Math.max(
                    d3.sum(node.sourceLinks, Link.getValue),
                    d3.sum(node.targetLinks, Link.getValue)
                );
            };
        };

        Class.initializeDepth = function(ky) {
            return function(node, i) {
                node.y = i;
                node.dy = node.value * ky;
                return node;
            };
        };

        Class.getSourceLinks = function(node) { return node.sourceLinks; };
        Class.getTargetLinks = function(node) { return node.targetLinks; };

        Class.sortLinks = function(node) {
            var getSourceY = function(node) { return node.source.y;};
            var getTargetY = function(node) { return node.target.y;};
            node.sourceLinks.sort(FN.ascendingNumerical(getTargetY));
            node.targetLinks.sort(FN.ascendingNumerical(getSourceY));
            return node;
        };

        Class.updateLinksDepths = function(node) {
            var sy = 0, ty = 0;
            node.sourceLinks.forEach(function(link) {
                link.sy = sy;
                sy += link.dy;
            });
            node.targetLinks.forEach(function(link) {
                link.ty = ty;
                ty += link.dy;
            });
            return node;
        };

        Class.relax = function(alpha, getLinks, weightedLink, getValue, getCenter) {
            return function(node,i ) {
                var links = getLinks(node);
                if (links.length) {
                    var y = d3.sum(links, weightedLink) / d3.sum(links, getValue);
                    node.y += (y - getCenter(node)) * alpha;
                }
            };
        };



        return Class;
    }

    // -----------------------------------
    //  Link
    // -----------------------------------
    function LinkFN() {

        var FN = PureFN();
        var Class = function Link(optn) {
            var curvature = optn.curvature || 0.5;
            var instance = function(d) {
                var x0 = d.source.x + d.source.dx,
                    x1 = d.target.x,
                    xi = d3.interpolateNumber(x0, x1),
                    x2 = xi(curvature),
                    x3 = xi(1 - curvature),
                    y0 = d.source.y + d.sy + d.dy / 2,
                    y1 = d.target.y + d.ty + d.dy / 2;
                return "M" + x0 + "," + y0 +
                       "C" + x2 + "," + y0 +
                       " " + x3 + "," + y1 +
                       " " + x1 + "," + y1;
            };

            instance.curvature = function(_) {
                if (!arguments.length) return curvature;
                curvature = +_;
                return link;
            };

            return instance;
        };

        Class.getValue = function(link) {
            return link.value;
        };

        Class.targetWeight = function(link) { return FN.center(link.target) * link.value; };
        Class.sourceWeight = function(link) { return FN.center(link.source) * link.value; };

        Class.initializeDepth = function(ky) {
            return function(link, i) {
                link.dy = link.value * ky;
            };
        };

        Class.addNodeLinks = function(nodes) {
            return function(link) {
                var source = link.source,
                    target = link.target;
                if (typeof source === "number") source = link.source = nodes[link.source];
                if (typeof target === "number") target = link.target = nodes[link.target];
                source.sourceLinks.push(link);
                target.targetLinks.push(link);

            };
        };

        return Class;
    }

    return Class;
});
