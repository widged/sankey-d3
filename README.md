d3-sankey
=========

Reusable sankey component built with d3

    npm install -g bower
    cd /path/to/sankey-d3
    bower install

Requirements
-------
* requirejs - http://requirejs.org/
* d3js - http://d3js.org/

Credits
-------

sankey-layout.js was adapted from https://github.com/d3/d3-plugins/blob/master/sankey/sankey.js
Copyright (c) 2013, Michael Bostock. All Rights Reserved. See https://github.com/d3/d3-plugins/blob/master/LICENSE
Changed by Marielle Lange to use a flyweight pattern in order to minimise the amount of data copied in each closure


Approach
---------

There is nothing new about a sankey diagram. The problem of drawing one with d3 has been solved long ago. You can refer to this (http://bost.ocks.org/mike/sankey/)[interactive demonstration by Mike Bostock].

My contribution is of slightly different nature. How to organize the code to make it easy to reuse. Provider reusable components without imposing any dependency on a framework. The Sankey diagram is the first to come out. Others components will follow. Some will be based on d3, others not. 

The requirejs library is used to support a modular architecture. The code is organized in modules that very much play the role of what would be classes in traditional OO models. 

Within each module, the way the code is organized might look somewhat unfamiliar. I spent a bit of time researching what would be the best way to organize my code in Javascript and that's what I came up with. 

Like in d3, object construction is made through closures (that is the execution of a function rather than the provision of a literal object). Mainly because closure-based object creation guarantees stronger encapsulation thanks to the availability of truly private variables. However, it is important to be aware that closures bring the potential for memory to get wasted. Any time a new closure is generated, the variables and functions listed in that closure are captured in the instance. Each time, the functions are basically the same, but they are bound to different values. 

The prototype object was introduced in javascript to address that problem. The prototype provides a way to store the methods and properties shared across instances outside of the this object. This is known as a flyweight pattern. However the prototype forces us to make any shared method or property public. The trick then is to introduce the notion of a private prototype object. One that is available within a given module but not accessible outside that module. The by-default private "prototype-like" object is called PV (for Private). Most modules also have a FN (for generic functions) object. FN is used to store functions that are Pure in the functional sense. That is that have no side effect whatsoever. They don't change the state of the view, the state of the file system, or the state of stored data. They do nothing more receive an input, transform it, and return an output. The PV holder is for functions that have side effects. 

Within a module, state and methods are kept clearly separated. Only methods are attached to the `this` object (public scope). Methods are written to support a fluent interface whenever suitable. State variables are strictly private. They can only be accessed through accessors (getters and setters). 


