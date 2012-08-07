var Cesium = {};



/**
 * @constructor
 */
Cesium.Camera = function() {};


/**
 * @type {Cesium.Cartesian3}
 */
Cesium.Camera.prototype.direction;


/**
 * @type {Cesium.PerspectiveFrustrum}
 */
Cesium.Camera.prototype.frustum;


/**
 * @return {Cesium.CameraControllerCollection}
 */
Cesium.Camera.prototype.getControllers = function() {};


/**
 * @type {Cesium.Cartesian3}
 */
Cesium.Camera.prototype.position;


/**
 * @type {Cesium.Cartesian3}
 */
Cesium.Camera.prototype.right;


/**
 * @type {Cesium.Matrix4}
 */
Cesium.Camera.prototype.transform;


/**
 * @type {Cesium.Cartesian3}
 */
Cesium.Camera.prototype.up;



/**
 * @constructor
 */
Cesium.CameraControllerCollection = function() {};


/**
 */
Cesium.CameraControllerCollection.prototype.addSpindle = function() {};


/**
 */
Cesium.CameraControllerCollection.prototype.addFreeLook = function() {};



/**
 * @constructor
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
Cesium.Cartesian3 = function(x, y, z) {};



/**
 * @constructor
 * @param {Cesium.Camera} camera
 * @param {Cesium.Ellipsoid} ellipsoid
 */
Cesium.CentralBody = function(camera, ellipsoid) {};


/**
 * @type {Cesium.TileProvider}
 */
Cesium.CentralBody.prototype.dayTileProvider;


/**
 * @type {boolean}
 */
Cesium.CentralBody.prototype.showBumps;


/**
 * @type {boolean}
 */
Cesium.CentralBody.prototype.showClouds;


/**
 * @type {boolean}
 */
Cesium.CentralBody.prototype.showCloudShadows;


/**
 * @type {boolean}
 */
Cesium.CentralBody.prototype.showDay;


/**
 * @type {boolean}
 */
Cesium.CentralBody.prototype.showNight;


/**
 * @type {boolean}
 */
Cesium.CentralBody.prototype.showTerminator;



/**
 * @constructor
 */
Cesium.Context = function() {};


/**
 * @param {Cesium.Viewport} viewport
 */
Cesium.Context.prototype.setViewport = function(viewport) {};



/**
 * @constructor
 * @param {Cartesian3} radii
 */
Cesium.Ellipsoid = function(radii) {};


/**
 * @type {Cesium.Ellipsoid}
 */
Cesium.Ellipsoid.WGS84;



/**
 * @constructor
 */
Cesium.Matrix4 = function() {};



/**
 * @constructor
 * @param {Object} options
 */
Cesium.OpenStreetMapTileProvider = function(options) {};



/**
 * @constructor
 */
Cesium.PerspectiveFrustrum = function() {};


/**
 * @type {number}
 */
Cesium.PerspectiveFrustrum.prototype.aspectRatio;


/**
 * @type {number}
 */
Cesium.PerspectiveFrustrum.prototype.far;


/**
 * @type {number}
 */
Cesium.PerspectiveFrustrum.prototype.fovy;


/**
 * @type {number}
 */
Cesium.PerspectiveFrustrum.prototype.near;



/**
 * @constructor
 */
Cesium.Primitive = function() {};



/**
 * @constructor
 * @param {HTMLCanvasElement} canvas
 */
Cesium.Scene = function(canvas) {};


/**
 * @return {HTMLCanvasElement}
 */
Cesium.Scene.prototype.getCanvas = function() {};


/**
 * @return {WebGLRenderingContext}
 */
Cesium.Scene.prototype.getContext = function() {};


/**
 * @return {Cesium.CompositePrimitive}
 */
Cesium.Scene.prototype.getPrimitives = function() {};


/**
 * @type {Cesium.SceneMode}
 */
Cesium.Scene.prototype.mode;



/**
 * @constructor
 */
Cesium.SceneMode = function() {};


/**
 * @type {Cesium.SceneMode}
 */
Cesium.SceneMode.COLOMBUS_VIEW;


/**
 * @type {Cesium.SceneMode}
 */
Cesium.SceneMode.MORPHING;


/**
 * @type {Cesium.SceneMode}
 */
Cesium.SceneMode.SCENE2D;


/**
 * @type {Cesium.SceneMode}
 */
Cesium.SceneMode.SCENE3D;


/**
 * @typedef {{x: number, y: number, width: number, height: number}}
 */
Cesium.Viewport;
