// Global variables
var canvas;
var gl;        
 
//------------------------- Constants -------------------------
var program;
var vBuffer;
const height = 0.9;
const boxWidth = 0.19; //1.9/10
const boxHeight = 0.095; //1.9/20
var xPositions = [];
const extremeLeft = -0.95;
const extremeRight = 0.95;
const extremeTop = 0.95;
const extremeBottom = -0.95;
const numShapes = 7;
var currentExtremes;
var positionMatrix
var newShapeCanCome = false
var shapesInTheGrid = []
var interruptToEndGame = false
var quitGame = false
var gameHasEnded = false
var score = 1
var downPressed = false
var highestScore = 0
var startedGame = false

var colors = [
	[0.7,0,0],[0,0.7,0],[0,0,0.7],[0.7,0.8,0],[0.8,0,0.7],[0,0.7,0.6]
]

var grid = new Array(10)
for (var i = 0; i < 10; i++) {
	grid[i] = new Array(20)
	grid[i].fill(0)
}

const addCoordinates = (a, b) => {
	return (Math.round((a+b)*1000) / 1000);
};

//------------------------- Formation of Grid -------------------------
	//Formation of opaque rectangle
	var rectangle = [
		-1,1,0,0,0,
		-1,0.95,0,0,0,
		1,0.95,0,0,0,
		1,0.95,0,0,0,
		-1,1,0,0,0,
		1,1,0,0,0
	];

	var rectangle2 = [
		-1,-1,0,0,0,
		-1,-0.95,0,0,0,
		1,-0.95,0,0,0,
		1,-0.95,0,0,0,
		-1,-1,0,0,0,
		1,-1,0,0,0
	];

	//gridLines
	//verticalLines
	var verticalLines = [];
	var startW = -0.95;
	for(var i = 0; i <= 10; i++) {
		verticalLines.push(addCoordinates(startW, i*boxWidth), -0.95, 11, 9, 9, addCoordinates(startW, i*boxWidth), 0.95, 11, 9, 9);
	}

	//horizontalLines
	var horizontalLines = [];
	var startH = -0.95;
	for (var i = 0; i <= 20; i ++) {
		horizontalLines.push (-0.95, addCoordinates (startH, i*boxHeight), 11, 9, 9, 0.95, addCoordinates(startH, i*boxHeight), 11, 9, 9);
	}

	//combinedLines
	var combinedLines = horizontalLines.concat (verticalLines);
	//------------------------- Formation of Grid -------------------------

//------------------------- Functions -------------------------

for (let x = -0.95; x < (0.95 - 3*boxWidth); ) {
	xPositions.push(x);
	x = addCoordinates(x, boxWidth);
}

len = xPositions.length;

window.onload = function init() {

	//------------------------- DO NOT TOUCH -------------------------
    canvas = document.getElementById( "gl-canvas" );
	gl = WebGLUtils.setupWebGL(canvas);
    if ( !gl ) { alert( "WebGL isn't available" ); }
	gl.viewport( 0, 0, canvas.width, canvas.height );
	gl.clearColor( 0.0, 0.0, 0.0, 0.9 );
	vBuffer = gl.createBuffer();
	
	
    //  Load shaders and initialize attribute buffers
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
	gl.useProgram( program );

    // Binding the vertex buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
	//------------------------- DO NOT TOUCH -------------------------


	// Associate out shader variables with our data buffer
	var vPosition = gl.getAttribLocation( program, "vPosition" );
	var vColor = gl.getAttribLocation( program, "vertColor" );
	gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 5*4, 0);
	gl.vertexAttribPointer( vColor, 3, gl.FLOAT, false, 5*4, 2*4);
	gl.enableVertexAttribArray( vPosition ); 
	gl.enableVertexAttribArray( vColor ); 

	render();
};

//------------------------- Functions -------------------------
function initialCoordinates() {
	return xPositions[Math.floor((Math.random() * len))];
}

const giveFirstIndex = (x_position) => {
	var result =  (addCoordinates (x_position, -1 * extremeLeft)) / boxWidth;
	return addCoordinates (result, 0);
}

function giveNewIndicesAfterRotation (currentIndices, pivotIndices) {
	 indices = currentIndices.slice();
	for (var i = 0; i < indices.length; i++) {
		indices[i] = currentIndices[i].slice()
		var xIndexwrtPivot = indices[i][0] - pivotIndices[0]
		var yIndexwrtPivot = indices[i][1] - pivotIndices[1]
		indices[i][0] = (indices[i][0] - xIndexwrtPivot) + yIndexwrtPivot
		indices[i][1] = (indices[i][1] - yIndexwrtPivot) - xIndexwrtPivot
	}
	return indices
}

function rotationPossible (currentIndices, pivotIndices) {
	const indicesAfterRotation = giveNewIndicesAfterRotation (currentIndices, pivotIndices)
	for (var i= 0; i < indicesAfterRotation.length; i++) {
		if (indicesAfterRotation[i][0] < 0 || indicesAfterRotation[i][0] > 9) {
			return null
		}
		if (indicesAfterRotation[i][1] < 0 || indicesAfterRotation[i][1] > 19) {
			return null
		}
		if (grid[indicesAfterRotation[i][0]][indicesAfterRotation[i][1]] == 1) {
			return null
		}
	}

	return indicesAfterRotation
}

function getNewExtremes(indices) {
	var maxXIndex = indices[0][0]
	var maxYIndex = indices[0][1]
	var minXIndex = indices[0][0]
	var minYIndex = indices[0][1]
	for (var i = 1; i < indices.length; i++) {
		if (indices[i][0] > maxXIndex) maxXIndex = indices[i][0]
		if (indices[i][0] < minXIndex) minXIndex = indices[i][0]
		if (indices[i][1] > maxYIndex) maxYIndex = indices[i][1]
		if (indices[i][1] < minYIndex) minYIndex = indices[i][1] 
	}
	return [addCoordinates(extremeLeft, minXIndex * boxWidth),
			addCoordinates(extremeLeft, (maxXIndex+1) * boxWidth),
			addCoordinates(extremeTop, -1 * minYIndex * boxHeight),
			addCoordinates(extremeTop, -1 * (maxYIndex+1) * boxHeight)]
}

function rotate (currentShape) {
	if (currentShape.type == 'O') {
		return
	}
	var newIndices = rotationPossible (currentShape.indices, currentShape.pivot.indices)
	if (newIndices) {
		currentShape.indices = newIndices
		currentShape.angleOfRotation = (currentShape.angleOfRotation + 90) % 360
		currentExtremes = getNewExtremes(currentShape.indices)
	}
}

function canGoDown (indices) {
	for (var i = 0; i < indices.length; i++) {
		var xCor = indices[i][0]
		var yCor = indices[i][1] + 1
		if (grid[xCor][yCor] != 0) {
			return false
		}
	}
	return true
}

function canGoLeft (indices) {
	for (var i = 0; i < indices.length; i++) {
		var xCor = indices[i][0] - 1
		var yCor = indices[i][1]
		if (grid[xCor][yCor] != 0) {
			return false
		}
	}
	return true
}

function canGoRight (indices) {
	for (var i = 0; i < indices.length; i++) {
		var xCor = indices[i][0] + 1
		var yCor = indices[i][1]
		if (grid[xCor][yCor] != 0) {
			return false
		}
	}
	return true
}

//------------------------- Functions -------------------------

var allPossibleShapes = [
	{
		xPos: initialCoordinates(),
		yPos: 0.95,
		type: 'O',
		angleOfRotation: 0,
		coordinates: function() { return ([
			//O Shape:
			this.xPos, this.yPos, 1,0,0,																			//1-1
			addCoordinates (this.xPos, boxWidth), this.yPos, 1,0,0,
			this.xPos, addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), this.yPos, 1,0,0,														//1-2
			this.xPos, addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), this.yPos, 1,0,0,														//2-1
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2 * boxWidth), this.yPos, 1,0,0,
			addCoordinates (this.xPos, 2 * boxWidth), this.yPos, 1,0,0,												//2-2
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2 * boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			this.xPos, addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,												//3-1
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			this.xPos, addCoordinates (this.yPos, -2 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,						//3-2
			this.xPos, addCoordinates (this.yPos, -2 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -2 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,						//4-1
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -2 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2 * boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2 * boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,					//4-2
			addCoordinates (this.xPos, 2 * boxWidth), addCoordinates (this.yPos, -2 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -2 * boxHeight), 1,0,0
		])},
		pivot: {
			x: addCoordinates (this.xPos, boxWidth), y: addCoordinates (this.yPos, -1 * boxHeight),
			indices: null
		},
		extremes: function() { return ([
			//O Shape
			this.xPos,											//Left-extreme
			addCoordinates (this.xPos, 2 * boxWidth),			//right-extreme
			this.yPos,											//top-extreme
			addCoordinates (this.yPos, -2 * boxHeight)			//bottom-extreme
		])}
	},
	{
		//I Shape:
		xPos: initialCoordinates(),
		yPos: 0.95,
		type: 'I',
		angleOfRotation: 0,
		coordinates: function() { return ([
			this.xPos, this.yPos,	1,0,0,															//1-1
			addCoordinates (this.xPos, boxWidth), this.yPos, 1,0,0,
			this.xPos, addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), this.yPos, 1,0,0,									//1-2
			this.xPos, addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), this.yPos, 1,0,0,									//2-1
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2*boxWidth), this.yPos, 1,0,0,
			addCoordinates (this.xPos, 2*boxWidth), this.yPos, 1,0,0,								//2-2
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2*boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2*boxWidth), this.yPos, 1,0,0,								//3-1
			addCoordinates (this.xPos, 2*boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 3*boxWidth), this.yPos, 1,0,0,
			addCoordinates (this.xPos, 3*boxWidth), this.yPos, 1,0,0,								//3-2
			addCoordinates (this.xPos, 2*boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 3*boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 3*boxWidth), this.yPos, 1,0,0,								//4-1
			addCoordinates (this.xPos, 4*boxWidth), this.yPos, 1,0,0,
			addCoordinates (this.xPos, 3*boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 4*boxWidth), this.yPos, 1,0,0,								//4-2
			addCoordinates (this.xPos, 3*boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 4*boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0
		])},
		pivot: {
			indices: [-1, -1]
		},
		extremes: function() { return ([
			//I Shape
			this.xPos,
			addCoordinates (this.xPos, 4 * boxWidth),
			this.yPos,
			addCoordinates (this.yPos, -1 * boxHeight)
		])}
	},
	{
		//S Shape:
		xPos: initialCoordinates(),
		yPos: 0.95,
		type: 'S',
		angleOfRotation: 0,
		coordinates: function() { return ([
			this.xPos, this.yPos, 1,0,0,																			//1-1
			addCoordinates (this.xPos, boxWidth), this.yPos, 1,0,0,
			this.xPos, addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), this.yPos, 1,0,0,														//1-2
			this.xPos, addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), this.yPos, 1,0,0,														//2-1
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2 * boxWidth), this.yPos, 1,0,0,
			addCoordinates (this.xPos, 2 * boxWidth), this.yPos, 1,0,0,												//2-2
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2 * boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), this.yPos, 1,0,0,														//3-1
			addCoordinates (this.xPos, 2 * boxWidth), this.yPos, 1,0,0,
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, boxHeight), 1,0,0,							//3-2
			addCoordinates (this.xPos, 2 * boxWidth), this.yPos, 1,0,0,
			addCoordinates (this.xPos, 2 * boxWidth), addCoordinates (this.yPos, boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2 * boxWidth), this.yPos, 1,0,0,													//4-2
			addCoordinates (this.xPos, 2 * boxWidth), addCoordinates (this.yPos, boxHeight), 1,0,0,
			addCoordinates (this.xPos, 3 * boxWidth), this.yPos, 1,0,0,
			addCoordinates (this.xPos, 2 * boxWidth), addCoordinates (this.yPos, boxHeight), 1,0,0,						//4-3
			addCoordinates (this.xPos, 3 * boxWidth), this.yPos, 1,0,0,
			addCoordinates (this.xPos, 3 * boxWidth), addCoordinates (this.yPos, boxHeight), 1,0,0
		])},
		pivot: {
			indices: [-1, -1]
		},
		extremes: function() { return ([
			//S Shape
			this.xPos,
			addCoordinates (this.xPos, 3 * boxWidth),
			addCoordinates (this.yPos, boxHeight),
			addCoordinates (this.yPos, -1 * boxHeight)
		])}
	},
	{
		//Z Shape:
		xPos: initialCoordinates(),
		yPos: 0.95,
		type: 'Z',
		angleOfRotation: 0,
		coordinates: function() { return ([
			this.xPos, this.yPos, 1,0,0,																			//1-1
			addCoordinates (this.xPos, boxWidth), this.yPos, 1,0,0,
			this.xPos, addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), this.yPos, 1,0,0,														//1-2
			this.xPos, addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), this.yPos, 1,0,0,														//2-1
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2 * boxWidth), this.yPos, 1,0,0,
			addCoordinates (this.xPos, 2 * boxWidth), this.yPos, 1,0,0,												//2-2
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2 * boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,						//3-1
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -2 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2 * boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2 * boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,					//3-2
			addCoordinates (this.xPos, 2 * boxWidth), addCoordinates (this.yPos, -2 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -2 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2 * boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,												//4-1
			addCoordinates (this.xPos, 2 * boxWidth), addCoordinates (this.yPos, -2 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 3 * boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2 * boxWidth), addCoordinates (this.yPos, -2 * boxHeight), 1,0,0,						//4-2
			addCoordinates (this.xPos, 3 * boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 3 * boxWidth), addCoordinates (this.yPos, -2 * boxHeight), 1,0,0
		])},
		pivot: {
			indices: [-1, -1]
		},
		extremes: function() { return ([
			//Z Shape
			this.xPos,
			addCoordinates (this.xPos, 3 * boxWidth),
			this.yPos,
			addCoordinates (this.yPos, -2 * boxHeight)
		])}
	},
	{
		//L Shape:
		xPos: initialCoordinates(),
		yPos: 0.95,
		type: 'L',
		angleOfRotation: 0,
		coordinates: function() { return ([
			this.xPos, this.yPos,	1,0,0,															//1-1
			addCoordinates (this.xPos, boxWidth), this.yPos, 1,0,0,
			this.xPos, addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), this.yPos, 1,0,0,									//1-2
			this.xPos, addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), this.yPos, 1,0,0,									//2-1
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2*boxWidth), this.yPos, 1,0,0,
			addCoordinates (this.xPos, 2*boxWidth), this.yPos, 1,0,0,								//2-2
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2*boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2*boxWidth), this.yPos, 1,0,0,								//3-1
			addCoordinates (this.xPos, 2*boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 3*boxWidth), this.yPos, 1,0,0,
			addCoordinates (this.xPos, 3*boxWidth), this.yPos, 1,0,0,								//3-2
			addCoordinates (this.xPos, 2*boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 3*boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			this.xPos, addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,												//4-1
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			this.xPos, addCoordinates (this.yPos, -2 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,						//4-2
			this.xPos, addCoordinates (this.yPos, -2 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -2 * boxHeight), 1,0,0
		])},
		pivot: {
			indices: [-1, -1]
		},
		extremes: function() { return ([
			//L Shape
			this.xPos,
			addCoordinates (this.xPos, 3 * boxWidth),
			this.yPos,
			addCoordinates (this.yPos, -2 * boxHeight)
		])}
	},
	{
		//J Shape:
		xPos: initialCoordinates(),
		yPos: 0.95,
		type: 'J',
		angleOfRotation: 0,
		coordinates: function() { return ([
			this.xPos, this.yPos,	1,0,0,															//1-1
			addCoordinates (this.xPos, boxWidth), this.yPos, 1,0,0,
			this.xPos, addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), this.yPos, 1,0,0,									//1-2
			this.xPos, addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), this.yPos, 1,0,0,									//2-1
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2*boxWidth), this.yPos, 1,0,0,
			addCoordinates (this.xPos, 2*boxWidth), this.yPos, 1,0,0,								//2-2
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2*boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2*boxWidth), this.yPos, 1,0,0,								//3-1
			addCoordinates (this.xPos, 2*boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 3*boxWidth), this.yPos, 1,0,0,
			addCoordinates (this.xPos, 3*boxWidth), this.yPos, 1,0,0,								//3-2
			addCoordinates (this.xPos, 2*boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 3*boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2 * boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,												//4-1
			addCoordinates (this.xPos, 2 * boxWidth), addCoordinates (this.yPos, -2 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 3 * boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2 * boxWidth), addCoordinates (this.yPos, -2 * boxHeight), 1,0,0,						//4-2
			addCoordinates (this.xPos, 3 * boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 3 * boxWidth), addCoordinates (this.yPos, -2 * boxHeight), 1,0,0
		])},
		pivot: {
			indices: [-1, -1]
		},
		extremes: function() { return ([
			//J Shape
			this.xPos,
			addCoordinates (this.xPos, 3 * boxWidth),
			this.yPos,
			addCoordinates (this.yPos, -2 * boxHeight)
		])}
	},
	{
		//T Shape:
		xPos: initialCoordinates(),
		yPos: 0.95,
		type: 'T',
		angleOfRotation: 0,
		coordinates: function() { return ([
			this.xPos, this.yPos,	1,0,0,															//1-1
			addCoordinates (this.xPos, boxWidth), this.yPos, 1,0,0,
			this.xPos, addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), this.yPos, 1,0,0,									//1-2
			this.xPos, addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), this.yPos, 1,0,0,									//2-1
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2*boxWidth), this.yPos, 1,0,0,
			addCoordinates (this.xPos, 2*boxWidth), this.yPos, 1,0,0,								//2-2
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2*boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2*boxWidth), this.yPos, 1,0,0,								//3-1
			addCoordinates (this.xPos, 2*boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 3*boxWidth), this.yPos, 1,0,0,
			addCoordinates (this.xPos, 3*boxWidth), this.yPos, 1,0,0,								//3-2
			addCoordinates (this.xPos, 2*boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 3*boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,						//4-1
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -2 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2 * boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, 2 * boxWidth), addCoordinates (this.yPos, -1 * boxHeight), 1,0,0,					//4-2
			addCoordinates (this.xPos, 2 * boxWidth), addCoordinates (this.yPos, -2 * boxHeight), 1,0,0,
			addCoordinates (this.xPos, boxWidth), addCoordinates (this.yPos, -2 * boxHeight), 1,0,0
		])},
		pivot: {
			indices: [-1, -1]
		},
		extremes: function() { return ([
			//T Shape
			this.xPos,
			addCoordinates (this.xPos, 3 * boxWidth),
			this.yPos,
			addCoordinates (this.yPos, -2 * boxHeight)
		])}
	},
];

function secondRowStatus () {
	for (var i = 0; i < grid.length; i++) {
		if (grid[i][1] == 1) {
			return true
		}
	}
	return false
}

function getNextShape() {
	var shapeIndex = -1
	if (secondRowStatus()) {
		shapeIndex = Math.floor (Math.random() * 2) + 1
	} else {
		shapeIndex = Math.floor(Math.random()*numShapes);
	}
	var currentShape = Object.assign({}, { 
		...allPossibleShapes[shapeIndex], 
		indices: [[-1,-1], [-1, -1], [-1, -1], [-1, -1]],
		canMove: true,
		tryingToMove: true
	})
	currentShape.pivot = {...currentShape.pivot}
	currentExtremes = currentShape.extremes();
	var firstIndexX = giveFirstIndex (currentShape.xPos);
	switch (currentShape.type) {
		case "O":
			currentShape.indices[0] = [firstIndexX, 0]
			currentShape.indices[1] = [firstIndexX + 1, 0];
			currentShape.indices[2] = [firstIndexX, 0 + 1];
			currentShape.indices[3] = [firstIndexX + 1, 0 + 1];
			currentShape.pivot.indices = [-1, -1];
			break
		case "I":
			currentShape.indices[0] = [firstIndexX, 0]
			currentShape.indices[1] = [firstIndexX + 1, 0];
			currentShape.indices[2] = [firstIndexX + 2, 0];
			currentShape.indices[3] = [firstIndexX + 3, 0];
			currentShape.pivot.indices = currentShape.indices[2].slice();
			break
			//TODO: Fix S
		case "S":
			currentShape.indices[0] = [firstIndexX, 0]
			currentShape.indices[1] = [firstIndexX + 1, 0];
			currentShape.indices[2] = [firstIndexX + 1, -1];
			currentShape.indices[3] = [firstIndexX + 2, -1];
			currentShape.pivot.indices = currentShape.indices[2].slice();
			break
		case "Z":
			currentShape.indices[0] = [firstIndexX, 0]
			currentShape.indices[1] = [firstIndexX + 1, 0];
			currentShape.indices[2] = [firstIndexX + 1, 0 + 1];
			currentShape.indices[3] = [firstIndexX + 2, 0 + 1];
			currentShape.pivot.indices = currentShape.indices[1].slice();
			break
		case "L":
			currentShape.indices[0] = [firstIndexX, 0]
			currentShape.indices[1] = [firstIndexX + 1, 0];
			currentShape.indices[2] = [firstIndexX + 2, 0];
			currentShape.indices[3] = [firstIndexX, 0 + 1];
			currentShape.pivot.indices = currentShape.indices[1].slice();
			break
		case "J":
			currentShape.indices[0] = [firstIndexX, 0]
			currentShape.indices[1] = [firstIndexX + 1, 0];
			currentShape.indices[2] = [firstIndexX + 2, 0];
			currentShape.indices[3] = [firstIndexX + 2, 0 + 1];
			currentShape.pivot.indices = currentShape.indices[1].slice();
			break
		case "T": 
			currentShape.indices[0] = [firstIndexX, 0]
			currentShape.indices[1] = [firstIndexX + 1, 0];
			currentShape.indices[2] = [firstIndexX + 2, 0];
			currentShape.indices[3] = [firstIndexX + 1, 0 + 1];
			currentShape.pivot.indices = currentShape.indices[1].slice();
			break
		default:
			console.warn('Unknown tile coming into grid')
	}
	currentShape.color = colors[Math.floor(Math.random() * 6)]
	return currentShape
}

var currentShape = getNextShape()

function resetTheGame() {
	score = 1
	for(var i = 0; i < grid.length; i++) {
		for(var j = 0; j < grid[i].length; j++) {
			grid[i][j] = 0
		}
	}
	shapesInTheGrid = []
	currentShape = getNextShape()
	quitGame = false
}

// // // Getting the keyboard input
window.addEventListener("keydown", getKey, false);
var downwardPressed = 0;
var leftPressed = 0;
var rightPressed = 0;

function getKey(key) {
	if (key.key == "ArrowDown") {
		downPressed = true
	}
	else if (key.key == "ArrowDown") {
		downwardPressed = 1;
	} else if (key.key == "ArrowRight") {
		if ((currentExtremes[1] < extremeRight) && currentShape.canMove && canGoRight (currentShape.indices)) {
			currentExtremes[0] = addCoordinates (currentExtremes[0], boxWidth);
			currentExtremes[1] = addCoordinates (currentExtremes[1], boxWidth);
			currentShape.xPos = addCoordinates(currentShape.xPos, boxWidth);
			updateIndices (currentShape, 'right')
			updatePivot(currentShape, 'right')
		}
	} else if (key.key == "ArrowLeft") {
		if ((currentExtremes[0] > extremeLeft) && currentShape.canMove && canGoLeft (currentShape.indices)) {
			currentExtremes[0] = addCoordinates (currentExtremes[0], -1 * boxWidth);
			currentExtremes[1] = addCoordinates (currentExtremes[1], -1 * boxWidth);
			currentShape.xPos = addCoordinates(currentShape.xPos, -1 * boxWidth);
			updateIndices (currentShape, 'left')
			updatePivot(currentShape, 'left')
		}
	} else if (key.key == "ArrowUp") {
		rotate (currentShape)
	} else if (key.which == 82) {
		resetTheGame();
		gameHasEnded = false
		gameEnds = false
		render()
	} else if (key.which == 81) {
		gameHasEnded = true
	} else if (key.which == 32) {
		startedGame = true
	}	
}

function updatePivot(currentShape, direction) {
	switch (direction) {
		case 'down':
			currentShape.pivot.indices[1]++
			break
		case 'right':
			currentShape.pivot.indices[0]++
			break
		case 'left':
			currentShape.pivot.indices[0]--	
			break
		default:
			console.warn ('Cannot go in any other direction')
	}
}


function updateIndices(currentShape, direction) {
	for(var i = 0; i < currentShape.indices.length; i++) {
		switch (direction) {
			case 'down':
				currentShape.indices[i][1]++
				break
			case 'right':
				currentShape.indices[i][0]++
				break
			case 'left':
				currentShape.indices[i][0]--
				break
			default:
				console.warn ('Cannot go in any other direction')
		}
	}
}

function updateGrid(indices) {
	for (var i = 0; i < indices.length; i++) {
		var xCor = indices[i][0]
		var yCor = indices[i][1]
		if (yCor == 0) {
			gameHasEnded = true
		}

		grid[xCor][yCor] = 1
	}
}

function rowCompleted() {
	for (var i = 0; i < 10; i++) {
		if (grid[i][19] != 1) {
			return false
		}
	}

	return true
}

function topRowReached() {
	for(var i = 0; i < grid.length; i++) {
		if (grid[i][0] == 1) {
			// quitGame = true
			gameHasEnded = true
			return true
		}
		return false
	}
}

function canNewShapeFit(indices) {
	for(var i = 0; i < indices.length; i++) {
		if (grid[indices[i][0]][indices[i][1]] == 1) {
			return false
		}
	}
	return true
}

// Interval for dropping tiles
function func () {
	const delay = setInterval(() => {
		if (currentExtremes[3] > extremeBottom && canGoDown(currentShape.indices)) {
			currentExtremes[2] = addCoordinates(currentExtremes[2], -1*boxHeight)
			currentExtremes[3] = addCoordinates(currentExtremes[3], -1*boxHeight)
			currentShape.yPos = addCoordinates(currentShape.yPos, -1*boxHeight);
			updateIndices (currentShape, 'down')
			updatePivot(currentShape, 'down')
			if (downPressed && canGoDown(currentShape.indices) && currentExtremes[3] > extremeBottom) {
				updateIndices (currentShape, 'down')
				updatePivot(currentShape, 'down')
				downPressed = false
			}
		} 
		else {
			currentShape.canMove = false
			newShapeCanCome = true
			shapesInTheGrid.push (currentShape)
			updateGrid(currentShape.indices)
			while (rowCompleted()) {
				pushStackDown()
				pushDownGrid()
			}
			if (!gameHasEnded) {
				score++
				currentShape = getNextShape()
			}
		}
	}, 350);
}

func();

function getNewCoordinates(indices) {
	return [
		addCoordinates(extremeLeft, indices[0][0]*boxWidth), addCoordinates(extremeTop, -1*indices[0][1]*boxHeight), 1, 0, 0,
		addCoordinates(extremeLeft, indices[0][0]*boxWidth), addCoordinates(extremeTop, -1*(indices[0][1]+1)*boxHeight), 1, 0, 0,
		addCoordinates(extremeLeft, (indices[0][0]+1)*boxWidth), addCoordinates(extremeTop, -1*indices[0][1]*boxHeight), 1, 0, 0,

		addCoordinates(extremeLeft, (indices[0][0]+1)*boxWidth), addCoordinates(extremeTop, -1*(1+indices[0][1])*boxHeight), 1, 0, 0,
		addCoordinates(extremeLeft, indices[0][0]*boxWidth), addCoordinates(extremeTop, -1*(indices[0][1]+1)*boxHeight), 1, 0, 0,
		addCoordinates(extremeLeft, (indices[0][0]+1)*boxWidth), addCoordinates(extremeTop, -1*indices[0][1]*boxHeight), 1, 0, 0,

		addCoordinates(extremeLeft, indices[1][0]*boxWidth), addCoordinates(extremeTop, -1*indices[1][1]*boxHeight), 1, 0, 0,
		addCoordinates(extremeLeft, indices[1][0]*boxWidth), addCoordinates(extremeTop, -1*(indices[1][1]+1)*boxHeight), 1, 0, 0,
		addCoordinates(extremeLeft, (indices[1][0]+1)*boxWidth), addCoordinates(extremeTop, -1*indices[1][1]*boxHeight), 1, 0, 0,

		addCoordinates(extremeLeft, (indices[1][0]+1)*boxWidth), addCoordinates(extremeTop, -1*(1+indices[1][1])*boxHeight), 1, 0, 0,
		addCoordinates(extremeLeft, indices[1][0]*boxWidth), addCoordinates(extremeTop, -1*(indices[1][1]+1)*boxHeight), 1, 0, 0,
		addCoordinates(extremeLeft, (indices[1][0]+1)*boxWidth), addCoordinates(extremeTop, -1*indices[1][1]*boxHeight), 1, 0, 0,

		addCoordinates(extremeLeft, indices[2][0]*boxWidth), addCoordinates(extremeTop, -1*indices[2][1]*boxHeight), 1, 0, 0,
		addCoordinates(extremeLeft, indices[2][0]*boxWidth), addCoordinates(extremeTop, -1*(indices[2][1]+1)*boxHeight), 1, 0, 0,
		addCoordinates(extremeLeft, (indices[2][0]+1)*boxWidth), addCoordinates(extremeTop, -1*indices[2][1]*boxHeight), 1, 0, 0,

		addCoordinates(extremeLeft, (indices[2][0]+1)*boxWidth), addCoordinates(extremeTop, -1*(1+indices[2][1])*boxHeight), 1, 0, 0,
		addCoordinates(extremeLeft, indices[2][0]*boxWidth), addCoordinates(extremeTop, -1*(indices[2][1]+1)*boxHeight), 1, 0, 0,
		addCoordinates(extremeLeft, (indices[2][0]+1)*boxWidth), addCoordinates(extremeTop, -1*indices[2][1]*boxHeight), 1, 0, 0,

		addCoordinates(extremeLeft, indices[3][0]*boxWidth), addCoordinates(extremeTop, -1*indices[3][1]*boxHeight), 1, 0, 0,
		addCoordinates(extremeLeft, indices[3][0]*boxWidth), addCoordinates(extremeTop, -1*(indices[3][1]+1)*boxHeight), 1, 0, 0,
		addCoordinates(extremeLeft, (indices[3][0]+1)*boxWidth), addCoordinates(extremeTop, -1*indices[3][1]*boxHeight), 1, 0, 0,

		addCoordinates(extremeLeft, (indices[3][0]+1)*boxWidth), addCoordinates(extremeTop, -1*(1+indices[3][1])*boxHeight), 1, 0, 0,
		addCoordinates(extremeLeft, indices[3][0]*boxWidth), addCoordinates(extremeTop, -1*(indices[3][1]+1)*boxHeight), 1, 0, 0,
		addCoordinates(extremeLeft, (indices[3][0]+1)*boxWidth), addCoordinates(extremeTop, -1*indices[3][1]*boxHeight), 1, 0, 0
	]
}

function pushStackDown() {
	for(var i = 0; i < shapesInTheGrid.length; i++) {
		for(var j = 0; j < shapesInTheGrid[i].indices.length; j++) {
			shapesInTheGrid[i].indices[j][1] += 1
		}
	}
}

function pushDownGrid() {
	for(var i = 0; i < grid.length; i++) {
		for(var j = (grid[i].length - 1); j >= 1; j--) {
			grid[i][j] = grid[i][j-1]
		}
	}

	for (var i = 0; i < grid.length; i++) {
		grid[i][0] = 0;
	}
}

function setColors(currentShape) {
	var coordinates = getNewCoordinates (currentShape.indices)
	var chosenColor = currentShape.color
	for(var i = 0; i < coordinates.length; i+=5) {
		coordinates[i+2] = chosenColor[0]
		coordinates[i+3] = chosenColor[1]
		coordinates[i+4] = chosenColor[2]
	}
	return coordinates
}

function canShapeFitIn (indices) {
	for (var i = 0; i < indices.length; i++) {
		if (grid[indices[i][0]][indices[i][1]] == 1) {
			return false
		}
	}
	return true
}

//-------------------RENDER FUNCTION STARTS HERE- --------------------- //

function render() {
	
	// // Binding the vertex buffer
	gl.clear (gl.COLOR_BUFFER_BIT);
	for (var i = 0; i < shapesInTheGrid.length; i++) {
		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.bufferData( gl.ARRAY_BUFFER, flatten(setColors(shapesInTheGrid[i])), gl.STATIC_DRAW ); 
		gl.drawArrays(gl.TRIANGLES, 0, 24);
	}

	var gameEnds = false
	for (var i = 0; i < 10; i++) {
		if (grid[i][0] == 1) {
			gameEnds = true
		}
	}

	if (canShapeFitIn (currentShape.indices)) {
		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.bufferData( gl.ARRAY_BUFFER, flatten(setColors (currentShape)), gl.STATIC_DRAW ); 
		gl.drawArrays(gl.TRIANGLES, 0, 24);
	}

	if (score > highestScore) {
		highestScore = score
	}

	document.getElementById("currScore").innerHTML = "Your score is : " + score;
	document.getElementById("highestScore").innerHTML = "Highest score : " + highestScore;

	//Formation of grid
	gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
	gl.bufferData( gl.ARRAY_BUFFER, flatten(combinedLines), gl.STATIC_DRAW ); 
	gl.drawArrays( gl.LINES, 0, 42 + 22);

	gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
	gl.bufferData( gl.ARRAY_BUFFER, flatten(rectangle), gl.STATIC_DRAW );
	gl.drawArrays( gl.TRIANGLES, 0, 6);

	gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
	gl.bufferData( gl.ARRAY_BUFFER, flatten(rectangle2), gl.STATIC_DRAW );
	gl.drawArrays( gl.TRIANGLES, 0, 6);

	if (!gameHasEnded && !gameEnds && !interruptToEndGame) {
		window.requestAnimFrame(render);
	}
}