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

The requirejs library provides the backbone of a modular architecture.  The code is organized in modules that very much play the role of what would be classes in traditional Object Oriented models.

Within each module, the way the code is organized might look somewhat unfamiliar. I spent a bit of time researching what would be the best way to organize my code in Javascript and that's what seem the best compromise.

Like in d3, object construction is made through closures (that is the execution of a function rather than the provision of a literal object). Mainly because closure-based object creation guarantees stronger encapsulation thanks to the availability of truly private variables. However, it is important to be aware that closures bring the potential for memory to get wasted. Any time a new closure is generated, the variables and functions listed in that closure are captured in the instance. Each time, the functions are basically the same, but they are bound to different values. 

The prototype object was introduced in javascript to address that problem. The prototype provides a way to store the methods and properties shared across instances outside of the this object. This is known as a flyweight pattern. However the native prototype object imposes to make any shared method or property public. 

The trick then is to introduce the notion of a private prototype object. One that is available within a given module but not accessible outside that module. The by-default private "prototype-like" object is called PV (for Private). Most modules also have a FN (for generic functions) object. FN is used to store functions that are Pure in the functional sense. That is that have no side effect whatsoever. They don't change the state of the view, the state of the file system, or the state of stored data. They do nothing more receive an input, transform it, and return an output. The PV holder is for functions that have side effects. 

Within a module, state and methods are kept clearly separated. Only methods are attached to the `this` object (public scope). Methods are written to support a fluent interface whenever suitable. State variables are strictly private. They can only be accessed through accessors (getters and setters). 

Each module is built using the following template:

    /**
    
       @author: Marielle Lange
    */
    define(["dependency"], function(Dependency) {
    
        var extend = null; // If this class is meant to inherit from another class. 
    
    	// Objects constructed via a function to guarantee that all methods are defined when the class loads.  
        var PV = PrivateFN(), FN = PureFN(); 
    
        // ###################################
        //  Instance constructor
        // ###################################
    
        /*
          This will generate a new instance of the class.
          This function should be kept as light as possible as it's content will be copied in every instance created.  
          The groundwork should be delegated to functions in the Class scope, that is the PV (private functions) and FN (pure functions). 
          Ideally, the instance constructor shouldn't contain much more than the interface declaration along with necessary state read and write operations.
    
          Because prototypical inheritance is used, instances must be constructed with 'new MyClass()'. When you forget `new`, `this` inside 
          the constructor will point to the global object - See more at: http://shichuan.github.io/javascript-patterns/?utm_content=buffer2e037&utm_medium=social&utm_source=twitter.com&utm_campaign=buffer#sthash.umZJ99LM.dpuf
        */
        var Class = function MyClass() {
            
            var instance = this,
              // Beyond this point there will not be a single reference to this within the instance scope. 
              // Question of personal preference. I find "instance" to better reflect the intent as this is meant to be a constructor function that 
              // generates new instances. It also makes it easier to check that instance is only ever augmented with methods. The `instance1 object will 
              // never be used to store variables.  

                state = { prop1: null, prop2: "default value" };
              // A state variable is introduced to store instance variables. 
              // -- It can be used to declare the default values. 
              // -- It makes it easier to automate the generation of getters and setters via defineProperty.
              // -- It simplifies debugging as you can simply log the current state. 
              // -- It can help manage memory leaks. A the state object groups all variables that are referenced within the instance functions. 
              // The state variable remains private to the class and will always remain so. No state should ever be set using object.variable = value (unless defineProperty has been used to define a redirect to local accessor functions).
              // State must be accessed through accessors. A variable is set through object.variable(value) and accessed through object.variable() if you favour the 
              // d3 convention or object.setVariable(value) and object.getVariable() if you prefer a more traditional approach. 
    
            // ## Accessors
            instance.prop1 = function(_) {
                if (!arguments.length) { return state.prop1; }
                state.prop1 = _;
            };
    
            instance.prop2 = function(_) {
                if (!arguments.length) { return state.prop1; }
                state.prop1 = _;
            };
    
            // ## Main
            instance.operation1 = function(arg1) {
                return PV.abstraction1(state.prop1, arg1);
            };
    
            instance.operation2 = function(arg1) {
               var result = FN.abstraction2(arg1, function(newProp1, newProp2) {
                   state.prop1 = newProp1;
                   state.prop2 = newProp2;
               });
            };
    
            // ## Utils
            instance.toString = function() {
                return "[DefaultClass] " + JSON.stringify(state);
            };
    
        };
        if(extend && typeof extend === "function") { Class.prototype = new extend(); } 
    
        /**
          Static methods. 
        
          Static methods can be created by 
          adding them to the Class object. 
        */
        Class.doThis = function() { /* ... */ };
    
    
        // ###################################
        //  Flyweight pattern
        // 
        //  The PV and FN objects listed below serve the same purpose as the prototype object (flyweight pattern, store outside of an instance 
        //  the data and functions shared across instances). Though they are kept private, accessible only from within the scope, each method is 
        //  available to every instance of MyClass. 
        // 
        // That the PV and FN objects are private to the Class doesn't mean that they are necessarily inaccessible to testing. They could be 
        // Because they don't rely on any Class or instance specific knowledge, the PV or FN objects can easily be moved to their
        // own module and added as dependency of the class. 
        // ###################################
    
        /**
            Private functions.
    
            Functions that have no reason to be accessible from outside this module.
            These functions have side effects. 
            They have no knowledge of an instance state. 
        */
    
        function PrivateFN() {
          "use strict";
    
          var PV = {};
    
          PV.abstraction1 = function() { /* ... */ };
    
          return PV;
        }
    
    
        /**
            Pure functions. 
    
            These functions have no side effects. 
            They make no attempt to read or write on any input or output stream..
            They have no knowledge of an instance state. 
            They never refer to the PV or Class object.
        */
        function PureFunctions() {
    
            "use strict";
    
            var FN = {};
    
            // For the ultra cautious, Class and PV can be set to null in this scope to prevent access to them. 
            var Class = null, PV = null;
    
            FN.abstraction2 = function() { /* ... */ };
    
            return FN;
    
        }
    });
    


