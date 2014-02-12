d3-sankey
=========

Reusable sankey component built with d3

    npm install -g bower
    cd /path/to/sankey-d3
    bower install

Then double click example/index.html to open it in your browser.

Requirements
-------
* requirejs - http://requirejs.org/
* d3js - http://d3js.org/

Note. We used version 3.2.4 of d3js. The latest version require a different requirejs config. 

Credits
-------

sankey-layout.js was adapted from https://github.com/d3/d3-plugins/blob/master/sankey/sankey.js
Copyright (c) 2013, Michael Bostock. All Rights Reserved. See [license](https://github.com/d3/d3-plugins/blob/master/LICENSE)
Changed by Marielle Lange to use a flyweight pattern in order to minimise the amount of data copied in each closure


Approach
---------

There is nothing new about a sankey diagram. The problem of drawing one with d3 has been solved long ago. You can refer to this [interactive demonstration by Mike Bostock](http://bost.ocks.org/mike/sankey/).

My contribution is of slightly different nature. How to organize the code to make it easy to reuse. Provide reusable components without imposing any dependency on a framework. The Sankey diagram is the first to come out. Others components will follow. Some will be based on d3, others not. 

That approach is described in [vanilla-class github project](https://github.com/widged/vanilla-class)

