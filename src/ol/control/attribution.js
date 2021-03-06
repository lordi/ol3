// FIXME handle rotation
// FIXME handle date line wrap
// FIXME handle layer order
// FIXME check clean-up code

goog.provide('ol.control.Attribution');

goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.object');
goog.require('goog.style');
goog.require('ol.Collection');
goog.require('ol.CoverageArea');
goog.require('ol.MapProperty');
goog.require('ol.TileCoverageArea');
goog.require('ol.control.Control');
goog.require('ol.layer.Layer');



/**
 * @constructor
 * @extends {ol.control.Control}
 * @param {ol.Map} map Map.
 */
ol.control.Attribution = function(map) {

  goog.base(this, map);

  /**
   * @private
   * @type {Element}
   */
  this.ulElement_ = goog.dom.createElement(goog.dom.TagName.UL);

  /**
   * @private
   * @type {Array.<number>}
   */
  this.layersListenerKeys_ = null;

  /**
   * @private
   * @type {Object.<number, ?number>}
   */
  this.layerVisibleChangeListenerKeys_ = {};

  /**
   * @private
   * @type {Object.<number, Element>}
   */
  this.attributionElements_ = {};

  /**
   * @private
   * @type {Object.<number, Array.<ol.CoverageArea>>}
   */
  this.coverageAreass_ = {};

  goog.events.listen(
      map, ol.Object.getChangedEventType(ol.MapProperty.CENTER),
      this.handleMapChanged, false, this);

  goog.events.listen(
      map, ol.Object.getChangedEventType(ol.MapProperty.LAYERS),
      this.handleMapLayersChanged, false, this);

  goog.events.listen(map,
      ol.Object.getChangedEventType(ol.MapProperty.RESOLUTION),
      this.handleMapChanged, false, this);

  goog.events.listen(map, ol.Object.getChangedEventType(ol.MapProperty.SIZE),
      this.handleMapChanged, false, this);

  this.handleMapLayersChanged();

};
goog.inherits(ol.control.Attribution, ol.control.Control);


/**
 * @param {ol.layer.Layer} layer Layer.
 * @protected
 */
ol.control.Attribution.prototype.addLayer = function(layer) {

  var layerKey = goog.getUid(layer);

  this.layerVisibleChangeListenerKeys_[layerKey] = goog.events.listen(
      layer, ol.Object.getChangedEventType(ol.layer.LayerProperty.VISIBLE),
      this.handleLayerVisibleChanged, false, this);

  if (layer.getStore().isReady()) {
    this.createAttributionElementsForLayer_(layer);
  } else {
    goog.events.listenOnce(layer, goog.events.EventType.LOAD,
        this.handleLayerLoad, false, this);
  }

};


/**
 * @param {ol.layer.Layer} layer Layer.
 * @private
 */
ol.control.Attribution.prototype.createAttributionElementsForLayer_ =
    function(layer) {

  var store = layer.getStore();
  var attributions = store.getAttributions();
  if (goog.isNull(attributions)) {
    return;
  }

  var map = this.getMap();
  var mapIsDef = map.isDef();
  var mapExtent = /** @type {ol.Extent} */ map.getExtent();
  var mapProjection = /** @type {ol.Projection} */ map.getProjection();
  var mapResolution = /** @type {number} */ map.getResolution();

  var layerVisible = layer.getVisible();

  var attributionVisibilities;
  if (mapIsDef && layerVisible) {
    attributionVisibilities = this.getLayerAttributionVisiblities_(
        layer, mapExtent, mapResolution, mapProjection);
  } else {
    attributionVisibilities = null;
  }

  goog.array.forEach(attributions, function(attribution) {

    var attributionKey = goog.getUid(attribution);

    var attributionElement = goog.dom.createElement(goog.dom.TagName.LI);
    attributionElement.innerHTML = attribution.getHtml();

    if (!map.isDef ||
        !layerVisible ||
        goog.isNull(attributionVisibilities) ||
        !attributionVisibilities[attributionKey]) {
      goog.style.showElement(attributionElement, false);
    }

    goog.dom.appendChild(this.ulElement_, attributionElement);

    this.attributionElements_[attributionKey] = attributionElement;

  }, this);

};


/**
 * @inheritDoc
 */
ol.control.Attribution.prototype.getElement = function() {
  return this.ulElement_;
};


/**
 * @param {ol.layer.Layer} layer Layer.
 * @param {ol.Extent} mapExtent Map extent.
 * @param {number} mapResolution Map resolution.
 * @param {ol.Projection} mapProjection Map projection.
 * @return {Object.<number, boolean>} Attribution visibilities.
 * @private
 */
ol.control.Attribution.prototype.getLayerAttributionVisiblities_ =
    function(layer, mapExtent, mapResolution, mapProjection) {

  var store = layer.getStore();
  var attributions = store.getAttributions();

  if (goog.isNull(attributions)) {
    return null;
  }

  var mapZ;
  if (store instanceof ol.TileStore) {
    var tileStore = /** @type {ol.TileStore} */ store;
    var tileGrid = tileStore.getTileGrid();
    mapZ = tileGrid.getZForResolution(mapResolution);
  }

  var attributionVisibilities = {};
  goog.array.forEach(attributions, function(attribution) {

    var attributionKey = goog.getUid(attribution);

    var attributionVisible = true;

    var coverageAreas;
    if (attributionKey in this.coverageAreass_) {
      coverageAreas = this.coverageAreass_[attributionKey];
    } else {
      var attributionProjection = attribution.getProjection();
      coverageAreas = attribution.getCoverageAreas();
      if (!goog.isNull(coverageAreas) &&
          !ol.Projection.equivalent(attributionProjection, mapProjection)) {
        var transformFn = ol.Projection.getTransform(
            attributionProjection, mapProjection);
        if (transformFn !== ol.Projection.cloneTransform) {
          coverageAreas = goog.array.map(coverageAreas, function(coverageArea) {
            return coverageArea.transform(transformFn);
          });
        }
      }
      this.coverageAreass_[attributionKey] = coverageAreas;
    }

    if (!goog.isNull(coverageAreas)) {
      if (store instanceof ol.TileStore) {
        attributionVisible = goog.array.some(
            coverageAreas,
            function(coverageArea, index) {
              return coverageArea.intersectsExtentAndZ(mapExtent, mapZ);
            });
      } else {
        attributionVisible = goog.array.some(
            coverageAreas,
            function(coverageArea) {
              return coverageArea.intersectsExtentAndResolution(
                  mapExtent, mapResolution);
            });
      }
    }

    attributionVisibilities[attributionKey] = attributionVisible;

  }, this);

  return attributionVisibilities;

};


/**
 * @param {goog.events.Event} event Event.
 */
ol.control.Attribution.prototype.handleLayerLoad = function(event) {
  var layer = /** @type {ol.layer.Layer} */ event.target;
  this.createAttributionElementsForLayer_(layer);
};


/**
 * @param {goog.events.Event} event Event.
 * @protected
 */
ol.control.Attribution.prototype.handleLayerVisibleChanged = function(event) {

  var map = this.getMap();
  var mapIsDef = map.isDef();
  var mapExtent = /** @type {ol.Extent} */ map.getExtent();
  var mapProjection = /** @type {ol.Projection} */ map.getProjection();
  var mapResolution = /** @type {number} */ map.getResolution();

  var layer = /** @type {ol.layer.Layer} */ event.target;

  this.updateLayerAttributionsVisibility_(
      layer, mapIsDef, mapExtent, mapResolution, mapProjection);

};


/**
 * @param {ol.CollectionEvent} collectionEvent Collection event.
 * @protected
 */
ol.control.Attribution.prototype.handleLayersAdd = function(collectionEvent) {
  var layer = /** @type {ol.layer.Layer} */ collectionEvent.elem;
  this.addLayer(layer);
};


/**
 * @param {ol.CollectionEvent} collectionEvent Collection event.
 * @protected
 */
ol.control.Attribution.prototype.handleLayersRemove =
    function(collectionEvent) {
  var layer = /** @type {ol.layer.Layer} */ collectionEvent.elem;
  this.removeLayer(layer);
};


/**
 * @protected
 */
ol.control.Attribution.prototype.handleMapChanged = function() {

  var map = this.getMap();
  var mapIsDef = map.isDef();
  var mapExtent = /** @type {ol.Extent} */ map.getExtent();
  var mapProjection = /** @type {ol.Projection} */ map.getProjection();
  var mapResolution = map.getResolution();

  var layers = map.getLayers();
  layers.forEach(function(layer) {
    this.updateLayerAttributionsVisibility_(
        layer, mapIsDef, mapExtent, mapResolution, mapProjection);
  }, this);

};


/**
 * @protected
 */
ol.control.Attribution.prototype.handleMapLayersChanged = function() {
  if (!goog.isNull(this.layersListenerKeys_)) {
    goog.array.forEach(this.layersListenerKeys_, goog.events.unlistenByKey);
    this.layersListenerKeys_ = null;
  }
  goog.object.forEach(this.attributionElements_, function(attributionElement) {
    goog.dom.removeNode(attributionElement);
  }, this);
  this.attributionElements_ = {};
  this.coverageAreass_ = {};
  var map = this.getMap();
  var layers = map.getLayers();
  if (goog.isDefAndNotNull(layers)) {
    layers.forEach(this.addLayer, this);
    this.layersListenerKeys_ = [
      goog.events.listen(layers, ol.CollectionEventType.ADD,
          this.handleLayersAdd, false, this),
      goog.events.listen(layers, ol.CollectionEventType.REMOVE,
          this.handleLayersRemove, false, this)
    ];
  }
};


/**
 * @param {ol.layer.Layer} layer Layer.
 * @protected
 */
ol.control.Attribution.prototype.removeLayer = function(layer) {

  var layerKey = goog.getUid(layer);

  goog.events.unlistenByKey(this.layerVisibleChangeListenerKeys_[layerKey]);
  delete this.layerVisibleChangeListenerKeys_[layerKey];

  goog.array.forEach(layer.getStore().getAttributions(), function(attribution) {
    var attributionKey = goog.getUid(attribution);
    delete this.coverageAreass_[attributionKey];
    var attributionElement = this.attributionElements_[attributionKey];
    goog.dom.removeNode(attributionElement);
    delete this.attributionElements_[attributionKey];
  }, this);

};


/**
 * @param {ol.layer.Layer} layer Layer.
 * @param {boolean} mapIsDef Map is defined.
 * @param {ol.Extent} mapExtent Map extent.
 * @param {number} mapResolution Map resolution.
 * @param {ol.Projection} mapProjection Map projection.
 * @private
 */
ol.control.Attribution.prototype.updateLayerAttributionsVisibility_ =
    function(layer, mapIsDef, mapExtent, mapResolution, mapProjection) {
  if (mapIsDef && layer.getVisible()) {
    var attributionVisibilities = this.getLayerAttributionVisiblities_(
        layer, mapExtent, mapResolution, mapProjection);
    goog.object.forEach(
        attributionVisibilities,
        function(attributionVisible, attributionKey) {
          var attributionElement = this.attributionElements_[attributionKey];
          goog.style.showElement(attributionElement, attributionVisible);
        },
        this);
  } else {
    var store = layer.getStore();
    var attributions = store.getAttributions();
    if (!goog.isNull(attributions)) {
      goog.array.forEach(attributions, function(attribution) {
        var attributionKey = goog.getUid(attribution);
        var attributionElement = this.attributionElements_[attributionKey];
        goog.style.showElement(attributionElement, false);
      }, this);
    }
  }
};
