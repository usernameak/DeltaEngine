var canvas;
var ctx;

var stopped = true;
var stoppedCallback = true;

function createJSVarExpression(funcName, vars) {
	var ret = {
		type: "Expr",
		funcName: "$jsdo",
		arg: [funcName, []]
	}
	for (var i = 0; i < vars.length; i++) {
		ret.arg[1].push({
			type: "Expr",
			funcName: "varget",
			arg: vars[i]
		})
	}
	return ret;
}
function createVarBehavesAs(name, vars) {
	return {
		name: name,
		args: vars.map(function(v) {
			return {
				type: "Expr",
				funcName: "varget",
				arg: v
			}
		})
	}
}

function drawRect(x, y, w, h, color, argbind) {
	ctx.fillStyle = runExpr(color, this, argbind);
	ctx.fillRect(runExpr(x, this, argbind), runExpr(y, this, argbind), runExpr(w, this, argbind), runExpr(h, this, argbind));
}
function setWindowSize(width, height, argbind) {
	canvas.width = runExpr(width, this, argbind);
	canvas.height = runExpr(height, this, argbind);
}
function drawCircle(cx, cy, radius, color, argbind) {
	ctx.beginPath();
	ctx.fillStyle = runExpr(color, this, argbind);
	ctx.arc(runExpr(cx, this, argbind), runExpr(cy, this, argbind), runExpr(radius, this, argbind), 0, 2 * Math.PI, false);
	ctx.fill();
	ctx.closePath();
}

var funcs = {
	"do": function(statements, comp, argbind) {
		if(statements instanceof Array) {
			for(var i = 0; i < statements.length; i++) {
				runExpr(statements[i], comp, argbind);
			}
		} else {
			return runExpr(statements, comp, argbind);
		}
		return null;
	},
	"$jsdo": function(args, comp, argbind) {
		return window[args[0]].apply(comp, args[1].concat([argbind]));
	},
	"add": function(args, comp, argbind) {
		return args.reduce(function(a, b) {
			return runExpr(a, comp, argbind) + runExpr(b, comp, argbind);
		});
	},
	"sub": function(args, comp, argbind) {
		return args.reduce(function(a, b) {
			return runExpr(a, comp, argbind) - runExpr(b, comp, argbind);
		});
	},
	"mul": function(args, comp, argbind) {
		return args.reduce(function(a, b) {
			return runExpr(a, comp, argbind) * runExpr(b, comp, argbind);
		});
	},
	"div": function(args, comp, argbind) {
		return args.reduce(function(a, b) {
			return runExpr(a, comp, argbind) / runExpr(b, comp, argbind);
		});
	},
	"set": function(args, comp, argbind) {
		comp.args[args[0]] = runExpr(args[1], comp, argbind);
	}
	// TODO: More functions
}

var defaultComponents = [
	{
		type: "Component",
		name: "Rectangle",
		args: ["x", "y", "width", "height", "color"],
		subcomponents: [],
		behavesas: [createVarBehavesAs("$DrawRectangle", ["x", "y", "width", "height", "color"])]
	},
	{
		type: "Component",
		name: "Circle",
		args: ["cx", "cy", "radius", "color"],
		subcomponents: [],
		behavesas: [createVarBehavesAs("$DrawCircle", ["cx", "cy", "radius", "color"])]
	},
	{
		type: "Component",
		name: "Window",
		args: ["width", "height"],
		subcomponents: [],
		behavesas: [createVarBehavesAs("$SetWindowSize", ["width", "height"])]
	}
];

var defaultBehaviors = [
	{
		type: "Behavior",
		name: "$DrawRectangle",
		args: ["x", "y", "width", "height", "color"],
		expr: createJSVarExpression("drawRect", ["x", "y", "width", "height", "color"]),
		triggeredby: "Render"
	},
	{
		type: "Behavior",
		name: "$DrawCircle",
		args: ["cx", "cy", "radius", "color"],
		expr: createJSVarExpression("drawCircle", ["cx", "cy", "radius", "color"]),
		triggeredby: "Render"
	},
	{
		type: "Behavior",
		name: "$SetWindowSize",
		args: ["width", "height"],
		expr: createJSVarExpression("setWindowSize", ["width", "height"]),
		triggeredby: "Start"
	}
]


function runExpr(expr, comp, argbind) {
	if(typeof expr == 'object' && expr !== null && expr.type) {
		if(expr.type == "Expr") {
			if(expr.funcName == "varget") {
				return expr.arg in argbind ? runExpr(expr, comp, {}) : runExpr(comp.args[expr.arg], comp.parent, argbind);
			}
			if(!funcs[expr.funcName]) {
				throw "Error: unknown function \"" + expr.funcName + "\"";
				return;
			}
			return funcs[expr.funcName](expr.arg, comp, argbind ? argbind : {});
		} else {
			throw "Error: unknown expression type \"" + expr.type + "\"";
			return;
		}
	}
	return expr;
}

function findComponentByName(comps, name) {
	for(var i = 0; i < comps.length; i++) {
		if(comps[i].name == name) return comps[i]; 
	}
	return null;
}

function findBehaviorsByTriggerAndNames(behaviors, trigger, names) {
	var ret = [];
	for(var i = 0; i < behaviors.length; i++) {
		if(behaviors[i].triggeredby == trigger && names.map(v=>v.name).indexOf(behaviors[i].name) > -1) ret.push(behaviors[i]);
	}
	return ret;
}

function loadComponent(comp, allcomps, args, parent) {
	var ret = {
		name: comp.name,
		args: {},
		behavesas: comp.behavesas,
		subcomponents: [],
		parent: parent
	};
	for(var i = 0; i < comp.args.length; i++) {
		ret.args[comp.args[i]] = args[i];//runExpr(args[i]);
	}
	for(var i = 0; i < comp.subcomponents.length; i++) {
		var scargs = [];
		var sc = comp.subcomponents[i];
		for(var j = 0; j < sc.args.length; j++) {
			//scargs[j] = runExpr(sc.args[j], ret, {});
			scargs[j] = sc.args[j];
		}
		ret.subcomponents.push(loadComponent(findComponentByName(allcomps, sc.name), allcomps, scargs, ret));
		
	}
	return ret;
}

function loadComponents(comps, startComp) {
	return loadComponent(findComponentByName(comps, startComp), comps, []);
}

function triggerRun(name, comp, behaviors) {
	if(comp.behavesas.length) {
		var cbh = findBehaviorsByTriggerAndNames(behaviors, name, comp.behavesas);
		for(var j = 0; j < cbh.length; j++) {
			var ab = {};
			for(var i = 0; i < cbh[j].args.length; i++) {
				
				var cba = comp.behavesas.filter(function(behavesas) {
					return behavesas.name == cbh[j].name;
				})[0];
				for(var k = 0; k < cbh[j].args.length; k++) {
					ab[cba.args[k]] = cbh[j].args[k];
				}
				
			}
			runExpr(cbh[j].expr, comp, ab);
		}
		
	}
	for(var i = 0; i < comp.subcomponents.length; i++) {
		triggerRun(name, comp.subcomponents[i], behaviors);
	}
}

function trigger(name, comps, behaviors) {
	return triggerRun(name, comps, behaviors);
}

function loadProgram(prog, startComp) {
	stopped = false;
	var components = defaultComponents.slice(0);
	var behaviors = defaultBehaviors.slice(0);
	for(var i = 0; i < prog.length; i++) {
		if(prog[i].type == "Component") {
			components.push(prog[i]);
		} else if(prog[i].type == "Behavior") {
			behaviors.push(prog[i]);
		}
	}
	
	var lcomps = loadComponents(components, startComp);
	trigger("Start", lcomps, behaviors);
	requestAnimationFrame(function() {
		trigger("tick", lcomps, behaviors);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		trigger("Render", lcomps, behaviors);
		if(!stopped) {
			requestAnimationFrame(arguments.callee);
		} else {
			runCallback();
		}
	});
	/*return lcomps;*/
}

function runCallback() {
	canvas = document.getElementById("canvas");
	ctx = canvas.getContext("2d");
	loadProgram(DSParser.parse(document.getElementById("codearea").value), "Main")
}

document.addEventListener("DOMContentLoaded", function() {
	document.getElementById("buildbtn").addEventListener("click", function() {
		if(stopped) {
			runCallback();
		} else {
			stopped = true;
		}
		
	});
});