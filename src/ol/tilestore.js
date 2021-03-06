goog.provide('ol.TileStore');

goog.require('ol.Attribution');
goog.require('ol.Store');
goog.require('ol.Tile');
goog.require('ol.TileCoord');
goog.require('ol.TileGrid');
goog.require('ol.TileUrlFunctionType');



/**
 * @constructor
 * @extends {ol.Store}
 * @param {ol.Projection} projection Projection.
 * @param {ol.TileGrid} tileGrid Tile grid.
 * @param {ol.TileUrlFunctionType} tileUrlFunction Tile URL.
 * @param {ol.Extent=} opt_extent Extent.
 * @param {Array.<string>=} opt_attributions Attributions.
 * @param {?string=} opt_crossOrigin Cross origin.
 */
ol.TileStore = function(projection, tileGrid, tileUrlFunction, opt_extent,
    opt_attributions, opt_crossOrigin) {

  goog.base(this, projection, opt_extent, opt_attributions);

  /**
   * @protected
   * @type {ol.TileGrid}
   */
  this.tileGrid = tileGrid;

  /**
   * @protected
   * @type {ol.TileUrlFunctionType}
   */
  this.tileUrlFunction = tileUrlFunction;

  /**
   * @private
   * @type {?string}
   */
  this.crossOrigin_ = opt_crossOrigin || 'anonymous';

  /**
   * @private
   * @type {Object.<string, ol.Tile>}
   * FIXME will need to expire elements from this cache
   * FIXME see elemoine's work with goog.structs.LinkedMap
   */
  this.tileCache_ = {};

};
goog.inherits(ol.TileStore, ol.Store);


/**
 * @inheritDoc
 */
ol.TileStore.prototype.getResolutions = function() {
  return this.tileGrid.getResolutions();
};


/**
 * @param {ol.TileCoord} tileCoord Tile coordinate.
 * @return {ol.Tile} Tile.
 */
ol.TileStore.prototype.getTile = function(tileCoord) {
  var key = tileCoord.toString();
  if (goog.object.containsKey(this.tileCache_, key)) {
    return this.tileCache_[key];
  } else {
    var tileUrl = this.getTileCoordUrl(tileCoord);
    var tile;
    if (goog.isDef(tileUrl)) {
      tile = new ol.Tile(tileCoord, tileUrl, this.crossOrigin_);
    } else {
      tile = null;
    }
    this.tileCache_[key] = tile;
    return tile;
  }
};


/**
 * @param {ol.TileCoord} tileCoord Tile coordinate.
 * @return {string|undefined} Tile URL.
 */
ol.TileStore.prototype.getTileCoordUrl = function(tileCoord) {
  return this.tileUrlFunction(tileCoord);
};


/**
 * @return {ol.TileGrid} Tile grid.
 */
ol.TileStore.prototype.getTileGrid = function() {
  return this.tileGrid;
};
