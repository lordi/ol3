goog.provide('ol3.TileStore');

goog.require('ol3.Attribution');
goog.require('ol3.Store');
goog.require('ol3.Tile');
goog.require('ol3.TileCoord');
goog.require('ol3.TileGrid');
goog.require('ol3.TileUrlFunctionType');


/**
 * @typedef {{attributions: (Array.<string>|undefined),
 *            crossOrigin: (?string|undefined),
 *            extent: (ol3.Extent|undefined),
 *            projection: ol3.Projection,
 *            tileGrid: ol3.TileGrid,
 *            tileUrlFunction: ol3.TileUrlFunctionType}}
 */
ol3.TileStoreOptions;



/**
 * @constructor
 * @extends {ol3.Store}
 * @param {ol3.TileStoreOptions} options Options.
 */
ol3.TileStore = function(options) {

  goog.base(this, options.projection, options.extent, options.attributions);

  /**
   * @protected
   * @type {ol3.TileGrid}
   */
  this.tileGrid = options.tileGrid;

  /**
   * @protected
   * @type {ol3.TileUrlFunctionType}
   */
  this.tileUrlFunction = options.tileUrlFunction;

  /**
   * @private
   * @type {?string}
   */
  this.crossOrigin_ = options.crossOrigin || 'anonymous';

  /**
   * @private
   * @type {Object.<string, ol3.Tile>}
   * FIXME will need to expire elements from this cache
   * FIXME see elemoine's work with goog.structs.LinkedMap
   */
  this.tileCache_ = {};

};
goog.inherits(ol3.TileStore, ol3.Store);


/**
 * @inheritDoc
 */
ol3.TileStore.prototype.getResolutions = function() {
  return this.tileGrid.getResolutions();
};


/**
 * @param {ol3.TileCoord} tileCoord Tile coordinate.
 * @return {ol3.Tile} Tile.
 */
ol3.TileStore.prototype.getTile = function(tileCoord) {
  var key = tileCoord.toString();
  if (goog.object.containsKey(this.tileCache_, key)) {
    return this.tileCache_[key];
  } else {
    var tileUrl = this.getTileCoordUrl(tileCoord);
    var tile;
    if (goog.isDef(tileUrl)) {
      tile = new ol3.Tile(tileCoord, tileUrl, this.crossOrigin_);
    } else {
      tile = null;
    }
    this.tileCache_[key] = tile;
    return tile;
  }
};


/**
 * @param {ol3.TileCoord} tileCoord Tile coordinate.
 * @return {string|undefined} Tile URL.
 */
ol3.TileStore.prototype.getTileCoordUrl = function(tileCoord) {
  return this.tileUrlFunction(tileCoord);
};


/**
 * @return {ol3.TileGrid} Tile grid.
 */
ol3.TileStore.prototype.getTileGrid = function() {
  return this.tileGrid;
};
