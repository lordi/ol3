// FIXME large resolutions lead to too large framebuffers :-(
// FIXME animated shaders! check in redraw

goog.provide('ol.renderer.webgl.TileLayer');
goog.provide('ol.renderer.webgl.tilelayerrenderer');
goog.provide('ol.renderer.webgl.tilelayerrenderer.shader.Fragment');
goog.provide('ol.renderer.webgl.tilelayerrenderer.shader.Vertex');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.debug.Logger');
goog.require('goog.events.EventType');
goog.require('goog.object');
goog.require('goog.vec.Mat4');
goog.require('goog.vec.Vec4');
goog.require('goog.webgl');
goog.require('ol.Coordinate');
goog.require('ol.MapEventType');
goog.require('ol.Size');
goog.require('ol.TileLayer');
goog.require('ol.TileState');
goog.require('ol.renderer.webgl.FragmentShader');
goog.require('ol.renderer.webgl.Layer');
goog.require('ol.renderer.webgl.VertexShader');



/**
 * @constructor
 * @extends {ol.renderer.webgl.FragmentShader}
 */
ol.renderer.webgl.tilelayerrenderer.shader.Fragment = function() {
  goog.base(this, [
    'precision mediump float;',
    '',
    'uniform sampler2D uTexture;',
    '',
    'varying vec2 vTexCoord;',
    '',
    'void main(void) {',
    ' gl_FragColor = texture2D(uTexture, vTexCoord);',
    '}'
  ].join('\n'));
};
goog.inherits(
    ol.renderer.webgl.tilelayerrenderer.shader.Fragment,
    ol.renderer.webgl.FragmentShader);
goog.addSingletonGetter(ol.renderer.webgl.tilelayerrenderer.shader.Fragment);



/**
 * @constructor
 * @extends {ol.renderer.webgl.VertexShader}
 */
ol.renderer.webgl.tilelayerrenderer.shader.Vertex = function() {
  goog.base(this, [
    'attribute vec2 aPosition;',
    'attribute vec2 aTexCoord;',
    '',
    'varying vec2 vTexCoord;',
    '',
    'uniform vec4 uTileOffset;',
    '',
    'void main(void) {',
    '  gl_Position.xy = aPosition * uTileOffset.xy + uTileOffset.zw;',
    '  gl_Position.z = 0.;',
    '  gl_Position.w = 1.;',
    '  vTexCoord = aTexCoord;',
    '}'
  ].join('\n'));
};
goog.inherits(
    ol.renderer.webgl.tilelayerrenderer.shader.Vertex,
    ol.renderer.webgl.VertexShader);
goog.addSingletonGetter(ol.renderer.webgl.tilelayerrenderer.shader.Vertex);



/**
 * @constructor
 * @extends {ol.renderer.webgl.Layer}
 * @param {ol.renderer.Map} mapRenderer Map renderer.
 * @param {ol.TileLayer} tileLayer Tile layer.
 */
ol.renderer.webgl.TileLayer = function(mapRenderer, tileLayer) {

  goog.base(this, mapRenderer, tileLayer);

  if (goog.DEBUG) {
    /**
     * @inheritDoc
     */
    this.logger = goog.debug.Logger.getLogger(
        'ol.renderer.webgl.tilelayerrenderer.' + goog.getUid(this));
  }

  /**
   * @private
   * @type {ol.renderer.webgl.FragmentShader}
   */
  this.fragmentShader_ =
      ol.renderer.webgl.tilelayerrenderer.shader.Fragment.getInstance();

  /**
   * @private
   * @type {ol.renderer.webgl.VertexShader}
   */
  this.vertexShader_ =
      ol.renderer.webgl.tilelayerrenderer.shader.Vertex.getInstance();

  /**
   * @private
   * @type {{aPosition: number,
   *         aTexCoord: number,
   *         uTileOffset: WebGLUniformLocation,
   *         uTexture: WebGLUniformLocation}|null}
   */
  this.locations_ = null;

  /**
   * @private
   * @type {WebGLBuffer}
   */
  this.arrayBuffer_ = null;

  /**
   * @private
   * @type {WebGLTexture}
   */
  this.texture_ = null;

  /**
   * @private
   * @type {WebGLFramebuffer}
   */
  this.framebuffer_ = null;

  /**
   * @private
   * @type {number|undefined}
   */
  this.framebufferDimension_ = undefined;

  /**
   * @private
   * @type {Object.<number, (number|null)>}
   */
  this.tileChangeListenerKeys_ = {};

  /**
   * @private
   * @type {goog.vec.Mat4.AnyType}
   */
  this.matrix_ = goog.vec.Mat4.createNumber();

};
goog.inherits(ol.renderer.webgl.TileLayer, ol.renderer.webgl.Layer);


/**
 * @param {number} framebufferDimension Framebuffer dimension.
 * @private
 */
ol.renderer.webgl.TileLayer.prototype.bindFramebuffer_ =
    function(framebufferDimension) {

  var mapRenderer = this.getMapRenderer();
  var gl = mapRenderer.getGL();

  if (!goog.isDef(this.framebufferDimension_) ||
      this.framebufferDimension_ != framebufferDimension) {

    if (goog.DEBUG) {
      this.logger.info('re-sizing framebuffer');
    }

    if (ol.renderer.webgl.FREE_RESOURCES_IMMEDIATELY) {
      if (goog.DEBUG) {
        this.logger.info('freeing WebGL resources');
      }
      if (!gl.isContextLost()) {
        gl.deleteFramebuffer(this.framebuffer_);
        gl.deleteTexture(this.texture_);
      }
    } else {
      var map = this.getMap();
      goog.events.listenOnce(
          map,
          ol.MapEventType.POST_RENDER,
          goog.partial(function(gl, framebuffer, texture) {
            if (goog.DEBUG) {
              this.logger.info('freeing WebGL resources on postrender');
            }
            if (!gl.isContextLost()) {
              gl.deleteFramebuffer(framebuffer);
              gl.deleteTexture(texture);
            }
          }, gl, this.framebuffer_, this.texture_));
    }

    var texture = gl.createTexture();
    gl.bindTexture(goog.webgl.TEXTURE_2D, texture);
    gl.texImage2D(goog.webgl.TEXTURE_2D, 0, goog.webgl.RGBA,
        framebufferDimension, framebufferDimension, 0, goog.webgl.RGBA,
        goog.webgl.UNSIGNED_BYTE, null);
    gl.texParameteri(goog.webgl.TEXTURE_2D, goog.webgl.TEXTURE_MAG_FILTER,
        goog.webgl.LINEAR);
    gl.texParameteri(goog.webgl.TEXTURE_2D, goog.webgl.TEXTURE_MIN_FILTER,
        goog.webgl.LINEAR);

    var framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(goog.webgl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(goog.webgl.FRAMEBUFFER,
        goog.webgl.COLOR_ATTACHMENT0, goog.webgl.TEXTURE_2D, texture, 0);

    this.texture_ = texture;
    this.framebuffer_ = framebuffer;
    this.framebufferDimension_ = framebufferDimension;

  } else {
    gl.bindFramebuffer(goog.webgl.FRAMEBUFFER, this.framebuffer_);
  }

};


/**
 * @inheritDoc
 */
ol.renderer.webgl.TileLayer.prototype.disposeInternal = function() {
  var mapRenderer = this.getMapRenderer();
  var gl = mapRenderer.getGL();
  if (!gl.isContextLost()) {
    gl.deleteBuffer(this.arrayBuffer_);
    gl.deleteFramebuffer(this.framebuffer_);
    gl.deleteTexture(this.texture_);
  }
  goog.base(this, 'disposeInternal');
};


/**
 * @return {ol.TileLayer} Layer.
 * @inheritDoc
 */
ol.renderer.webgl.TileLayer.prototype.getLayer = function() {
  return /** @type {ol.TileLayer} */ goog.base(this, 'getLayer');
};


/**
 * @inheritDoc
 */
ol.renderer.webgl.TileLayer.prototype.getMatrix = function() {
  return this.matrix_;
};


/**
 * @inheritDoc
 */
ol.renderer.webgl.TileLayer.prototype.getTexture = function() {
  return this.texture_;
};


/**
 * @protected
 */
ol.renderer.webgl.TileLayer.prototype.handleTileChange = function() {
  this.dispatchChangeEvent();
};


/**
 * @inheritDoc
 */
ol.renderer.webgl.TileLayer.prototype.handleWebGLContextLost = function() {
  this.locations_ = null;
  this.arrayBuffer_ = null;
  this.texture_ = null;
  this.framebuffer_ = null;
  this.framebufferDimension_ = undefined;
};


/**
 * @inheritDoc
 */
ol.renderer.webgl.TileLayer.prototype.render = function() {

  var animate = false;

  var mapRenderer = this.getMapRenderer();
  var map = this.getMap();
  var gl = mapRenderer.getGL();

  goog.asserts.assert(map.isDef());
  var mapCenter = map.getCenter();
  var mapExtent = map.getExtent();
  var mapResolution = /** @type {number} */ map.getResolution();
  var mapRotatedExtent = map.getRotatedExtent();
  var mapRotation = map.getRotation();

  var tileLayer = this.getLayer();
  var tileStore = tileLayer.getStore();
  var tileGrid = tileStore.getTileGrid();
  var z = tileGrid.getZForResolution(mapResolution);
  var tileResolution = tileGrid.getResolution(z);
  var tileRange = tileGrid.getTileRangeForExtentAndResolution(
      mapRotatedExtent, tileResolution);
  var tileRangeSize = tileRange.getSize();
  var tileSize = tileGrid.getTileSize();

  var maxDimension = Math.max(
      tileRangeSize.width * tileSize.width,
      tileRangeSize.height * tileSize.height);
  var framebufferDimension =
      Math.pow(2, Math.ceil(Math.log(maxDimension) / Math.log(2)));
  var framebufferExtentSize = new ol.Size(
      tileResolution * framebufferDimension,
      tileResolution * framebufferDimension);
  var origin = tileGrid.getOrigin(z);
  var minX = origin.x + tileRange.minX * tileSize.width * tileResolution;
  var minY = origin.y + tileRange.minY * tileSize.height * tileResolution;
  var framebufferExtent = new ol.Extent(
      minX,
      minY,
      minX + framebufferExtentSize.width,
      minY + framebufferExtentSize.height);

  this.bindFramebuffer_(framebufferDimension);
  gl.viewport(0, 0, framebufferDimension, framebufferDimension);

  gl.clearColor(0, 0, 0, 0);
  gl.clear(goog.webgl.COLOR_BUFFER_BIT);
  gl.disable(goog.webgl.BLEND);

  var program = mapRenderer.getProgram(
      this.fragmentShader_, this.vertexShader_);
  gl.useProgram(program);
  if (goog.isNull(this.locations_)) {
    this.locations_ = {
      aPosition: gl.getAttribLocation(program, 'aPosition'),
      aTexCoord: gl.getAttribLocation(program, 'aTexCoord'),
      uTileOffset: gl.getUniformLocation(program, 'uTileOffset'),
      uTexture: gl.getUniformLocation(program, 'uTexture')
    };
  }

  if (goog.isNull(this.arrayBuffer_)) {
    var arrayBuffer = gl.createBuffer();
    gl.bindBuffer(goog.webgl.ARRAY_BUFFER, arrayBuffer);
    gl.bufferData(goog.webgl.ARRAY_BUFFER, new Float32Array([
      0, 0, 0, 1,
      1, 0, 1, 1,
      0, 1, 0, 0,
      1, 1, 1, 0
    ]), goog.webgl.STATIC_DRAW);
    this.arrayBuffer_ = arrayBuffer;
  } else {
    gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.arrayBuffer_);
  }

  gl.enableVertexAttribArray(this.locations_.aPosition);
  gl.vertexAttribPointer(
      this.locations_.aPosition, 2, goog.webgl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(this.locations_.aTexCoord);
  gl.vertexAttribPointer(
      this.locations_.aTexCoord, 2, goog.webgl.FLOAT, false, 16, 8);
  gl.uniform1i(this.locations_.uTexture, 0);

  /**
   * @type {Object.<number, Object.<string, ol.Tile>>}
   */
  var tilesToDrawByZ = {};

  /**
   * @type {Array.<Image>}
   */
  var imagesToLoad = [];

  tilesToDrawByZ[z] = {};
  tileRange.forEachTileCoord(z, function(tileCoord) {

    var tile = tileStore.getTile(tileCoord);

    if (goog.isNull(tile)) {
      // FIXME - consider returning here as this is outside the store's extent
    } else if (tile.getState() == ol.TileState.LOADED) {
      if (mapRenderer.isImageTextureLoaded(tile.getImage())) {
        tilesToDrawByZ[z][tileCoord.toString()] = tile;
        return;
      } else {
        imagesToLoad.push(tile.getImage());
      }
    } else {
      var tileKey = goog.getUid(tile);
      if (!(tileKey in this.tileChangeListenerKeys_)) {
        tile.load();
        // FIXME will need to handle aborts as well
        this.tileChangeListenerKeys_[tileKey] = goog.events.listen(tile,
            goog.events.EventType.CHANGE, this.handleTileChange, false, this);
      }
    }

    // FIXME this could be more efficient about filling partial holes
    tileGrid.forEachTileCoordParentTileRange(
        tileCoord,
        function(z, tileRange) {
          var fullyCovered = true;
          tileRange.forEachTileCoord(z, function(tileCoord) {
            var tileCoordKey = tileCoord.toString();
            if (tilesToDrawByZ[z] && tilesToDrawByZ[z][tileCoordKey]) {
              return;
            }
            var tile = tileStore.getTile(tileCoord);
            if (!goog.isNull(tile) &&
                tile.getState() == ol.TileState.LOADED) {
              if (!tilesToDrawByZ[z]) {
                tilesToDrawByZ[z] = {};
              }
              tilesToDrawByZ[z][tileCoordKey] = tile;
            } else {
              fullyCovered = false;
            }
          });
          return fullyCovered;
        });

  }, this);

  /** @type {Array.<number>} */
  var zs = goog.object.getKeys(tilesToDrawByZ);
  goog.array.sort(zs);
  var uTileOffset = goog.vec.Vec4.createFloat32();
  goog.array.forEach(zs, function(z) {
    goog.object.forEach(tilesToDrawByZ[z], function(tile) {
      var tileExtent = tileGrid.getTileCoordExtent(tile.tileCoord);
      var sx = 2 * tileExtent.getWidth() / framebufferExtentSize.width;
      var sy = 2 * tileExtent.getHeight() / framebufferExtentSize.height;
      var tx = 2 * (tileExtent.minX - framebufferExtent.minX) /
          framebufferExtentSize.width - 1;
      var ty = 2 * (tileExtent.minY - framebufferExtent.minY) /
          framebufferExtentSize.height - 1;
      goog.vec.Vec4.setFromValues(uTileOffset, sx, sy, tx, ty);
      gl.uniform4fv(this.locations_.uTileOffset, uTileOffset);
      mapRenderer.bindImageTexture(
          tile.getImage(), goog.webgl.LINEAR, goog.webgl.LINEAR);
      gl.drawArrays(goog.webgl.TRIANGLE_STRIP, 0, 4);
    }, this);
  }, this);

  goog.vec.Mat4.makeIdentity(this.matrix_);
  goog.vec.Mat4.translate(this.matrix_,
      (mapCenter.x - framebufferExtent.minX) /
          (framebufferExtent.maxX - framebufferExtent.minX),
      (mapCenter.y - framebufferExtent.minY) /
          (framebufferExtent.maxY - framebufferExtent.minY),
      0);
  if (goog.isDef(mapRotation)) {
    goog.vec.Mat4.rotate(this.matrix_,
        mapRotation,
        0,
        0,
        1);
  }
  goog.vec.Mat4.scale(this.matrix_,
      (mapExtent.maxX - mapExtent.minX) /
          (framebufferExtent.maxX - framebufferExtent.minX),
      (mapExtent.maxY - mapExtent.minY) /
          (framebufferExtent.maxY - framebufferExtent.minY),
      1);
  goog.vec.Mat4.translate(this.matrix_,
      -0.5,
      -0.5,
      0);

  if (!goog.array.isEmpty(imagesToLoad)) {
    goog.events.listenOnce(
        map,
        ol.MapEventType.POST_RENDER,
        goog.partial(function(mapRenderer, imagesToLoad) {
          if (goog.DEBUG) {
            this.logger.info('uploading textures');
          }
          goog.array.forEach(imagesToLoad, function(image) {
            mapRenderer.bindImageTexture(
                image, goog.webgl.LINEAR, goog.webgl.LINEAR);
          });
        }, mapRenderer, imagesToLoad));
    animate = true;
  }

  return animate;

};
