"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var sdk_1 = require("grafana/app/plugins/sdk");
var time_series2_1 = require("grafana/app/core/time_series2");
var app_events_1 = require("grafana/app/core/app_events");
var _ = require("lodash");
var data_formatter_1 = require("./data_formatter");
require("./css/worldmap-panel.css");
//import $ from "jquery";
require("./css/leaflet.css");
var worldmap_1 = require("./worldmap");
//import moment from 'moment';
var Layer_1 = require("./Layer");
var Maps_1 = require("./Maps");
var panelDefaults = {
    maxDataPoints: 1,
    mapCenter: "(0°, 0°)",
    mapCenterLatitude: 0,
    mapCenterLongitude: 0,
    initialZoom: 1,
    valueName: "total",
    feature: {
        circleMinSize: 2,
        circleMaxSize: 30,
        colors: [
            ["rgba(245, 54, 54, 0.9)", "rgba(237, 129, 40, 0.89)", "rgba(50, 172, 45, 0.97)"],
            ["rgba(245, 54, 54, 0.9)", "rgba(237, 129, 40, 0.89)", "rgba(50, 172, 45, 0.97)"],
            ["rgba(245, 54, 54, 0.9)", "rgba(237, 129, 40, 0.89)", "rgba(50, 172, 45, 0.97)"]
        ],
        thresholds: [
            "0,10",
            "0,10",
            "0,10"
        ],
        width: 15,
        height: 40,
    },
    locationData: "OpenHistorian",
    showLegend: true,
    mouseWheelZoom: false,
    hideEmpty: false,
    hideZero: false,
    dataLabels: true,
    stickyLabels: false,
    constantLabels: false,
    mapBackground: "CartoDB Dark",
    popupstring: '{PointTag}',
    featureType: "circles",
    multiMaps: false,
    selectableMaps: [],
    customlayers: [],
    zoomSteps: 1,
    radiusOverlap: 10,
    moveOverlap: false,
    filter: "",
};
var mapCenters = {
    "(0°, 0°)": { mapCenterLatitude: 0, mapCenterLongitude: 0 },
    "North America": { mapCenterLatitude: 40, mapCenterLongitude: -100 },
    "Europe": { mapCenterLatitude: 46, mapCenterLongitude: 14 },
    "West Asia": { mapCenterLatitude: 26, mapCenterLongitude: 53 },
    "SE Asia": { mapCenterLatitude: 10, mapCenterLongitude: 106 },
};
var PhasorMapCtrl = /** @class */ (function (_super) {
    __extends(PhasorMapCtrl, _super);
    /** @ngInject **/
    function PhasorMapCtrl($scope, $injector, contextSrv) {
        var _this = _super.call(this, $scope, $injector) || this;
        _this.mapOptions = ['CartoDB Positron', 'CartoDB Dark', 'Open Topo Map', 'OpenStreetMap Mapnik', 'Esri NatGeo', 'Esri WorldShaded', 'Esri WorldPhysical', 'Stamen Toner', 'Stamen Terrain', 'Stamen Watercolor'];
        _this.SingleMapOptions = ['CartoDB Positron', 'CartoDB Dark', 'Open Topo Map', 'OpenStreetMap Mapnik', 'Esri NatGeo', 'Esri WorldShaded', 'Esri WorldPhysical', 'Stamen Toner', 'Stamen Terrain', 'Stamen Watercolor', 'custom'];
        //this.setMapProvider(contextSrv);
        _.defaults(_this.panel, panelDefaults);
        _this.dataFormatter = new data_formatter_1.default(_this);
        _this.events.on("init-edit-mode", _this.onInitEditMode.bind(_this));
        _this.events.on("data-received", _this.onDataReceived.bind(_this));
        _this.events.on("panel-teardown", _this.onPanelTeardown.bind(_this));
        _this.events.on("data-snapshot-load", _this.onDataSnapshotLoad.bind(_this));
        _this.loadLocationDataFromFile();
        _this.mapData = (_this.panel.multiMaps) ? _this.panel.selectableMaps.map(function (item) { return Maps_1.default.Deserialize(_this, item); }) : [new Maps_1.default(_this, _this.panel.mapBackground, {}, false)];
        if (_this.mapData[0].maps.length == 0) {
            _this.mapData[0].addMap(_this.panel.mapBackground, 100);
        }
        _this.panel.selectableMaps = (_this.panel.selectableMaps) ? _this.panel.selectableMaps : _this.mapData.map(function (item) { return item.Serialize(); });
        _this.layerData = (_this.panel.customlayers.length > 0) ? _this.panel.customlayers.map(function (item) { return Layer_1.default.Deserialize(_this, item); }) : [];
        return _this;
    }
    PhasorMapCtrl.prototype.setNewMapBackground = function () {
        this.mapData[0].maps = [];
        this.mapData[0].transitions = [];
        if (this.panel.mapBackground != "custom") {
            console.log("here");
            this.mapData[0].addMap(this.panel.mapBackground, 100);
            this.mapData[0].name = this.panel.mapBackground;
        }
        else {
            console.log("not here");
            this.mapData[0].addMap(this.mapOptions[0], 100);
            this.mapData[0].name = "Custom Map";
        }
        this.panel.selectableMaps = this.mapData.map(function (item) { return item.Serialize(); });
        this.map.mapChanged = true;
        this.render();
    };
    //setMapProvider(contextSrv) {
    //    if (this.panel.mapBackground) {
    //        this.tileServer = this.panel.mapBackground;
    //    }
    //    else {
    //        this.tileServer = "CartoDB Dark";
    //    }
    //    this.setMapSaturationClass();
    //}
    //setMapSaturationClass() {
    //  if (this.tileServer === "CartoDB Dark") {
    //    this.saturationClass = "map-darken";
    //  } else {
    //    this.saturationClass = "";
    //  }
    //}
    PhasorMapCtrl.prototype.loadLocationDataFromFile = function (reload) {
        if (this.map && !reload) {
            return;
        }
        if (this.panel.snapshotLocationData) {
            this.locations = this.panel.snapshotLocationData;
            return;
        }
        if (this.panel.locationData === "json endpoint") {
            if (!this.panel.jsonUrl) {
                return;
            }
            this.render();
        }
        else if (this.panel.locationData === "OpenHistorian") {
            this.render();
        }
    };
    PhasorMapCtrl.prototype.reloadLocations = function (res) {
        this.locations = res;
        this.refresh();
    };
    PhasorMapCtrl.prototype.onPanelTeardown = function () {
        if (this.map) {
            this.map.remove();
        }
    };
    PhasorMapCtrl.prototype.onInitEditMode = function () {
        this.addEditorTab("Phasormap", "public/plugins/grafana-pmumap-panel/partials/editor.html", 2);
    };
    PhasorMapCtrl.prototype.onDataReceived = function (dataList) {
        if (!dataList) {
            return;
        }
        // Start by getting the location data and updateing all dynamic map data
        var locationData = this.filterData(dataList);
        var locationPromise;
        try {
            if (this.panel.locationData === "json endpoint") {
                locationPromise = this.dataFormatter.setjsonendpoint(locationData);
            }
            else if (this.panel.locationData === "OpenHistorian") {
                locationPromise = this.dataFormatter.setOpenHistorian(locationData);
            }
            var ctrl_1 = this;
            locationPromise.then(function () {
                ctrl_1.series = ctrl_1.dataFormatter.ProcessData(dataList);
                ctrl_1.render();
                if (ctrl_1.dashboard.snapshot && ctrl_1.locations) {
                    ctrl_1.panel.snapshotLocationData = ctrl_1.locations;
                }
            });
        }
        catch (err) {
            app_events_1.default.emit('alert-error', ['Data error', err.toString()]);
            console.log(err);
        }
    };
    PhasorMapCtrl.prototype.filterData = function (data) {
        if (this.panel.filter == "") {
            return data;
        }
        var filter = this.panel.filter;
        try {
            filter = this.templateSrv.replace(this.panel.filter, this.panel.scopedVars, 'regex');
        }
        catch (e) {
            console.log('Map panel error: ', e);
        }
        var filtereddata = [];
        var re = new RegExp(filter);
        data.forEach(function (item) {
            if (re.test(item.target)) {
                filtereddata.push(item);
            }
        });
        return filtereddata;
    };
    PhasorMapCtrl.prototype.onDataSnapshotLoad = function (snapshotData) {
        this.onDataReceived(snapshotData);
    };
    PhasorMapCtrl.prototype.seriesHandler = function (seriesData) {
        var series = new time_series2_1.default({
            datapoints: seriesData.datapoints,
            alias: seriesData.target
        });
        series.flotpairs = series.getFlotPairs(this.panel.nullPointMode);
        return series;
    };
    PhasorMapCtrl.prototype.setNewMapCenter = function () {
        if (this.panel.mapCenter !== "custom") {
            this.panel.mapCenterLatitude =
                mapCenters[this.panel.mapCenter].mapCenterLatitude;
            this.panel.mapCenterLongitude =
                mapCenters[this.panel.mapCenter].mapCenterLongitude;
        }
        this.mapCenterMoved = true;
        this.render();
    };
    PhasorMapCtrl.prototype.setZoom = function () {
        this.map.setZoom(this.panel.initialZoom || 1);
    };
    PhasorMapCtrl.prototype.toggleLegend = function () {
        if (!this.panel.showLegend) {
            this.map.removeLegend();
        }
        this.render();
    };
    PhasorMapCtrl.prototype.toggleMouseWheelZoom = function () {
        this.map.setMouseWheelZoom();
        this.render();
    };
    PhasorMapCtrl.prototype.setfeaturetype = function () {
        if (this.panel.featureType === '4-bit bar') {
            this.panel.feature.colors = [
                ["rgba(245, 54, 54, 0.9)", "rgba(237, 129, 40, 0.89)", "rgba(50, 172, 45, 0.97)"],
                ["rgba(245, 54, 54, 0.9)", "rgba(237, 129, 40, 0.89)", "rgba(50, 172, 45, 0.97)"],
                ["rgba(245, 54, 54, 0.9)", "rgba(237, 129, 40, 0.89)", "rgba(50, 172, 45, 0.97)"]
            ];
        }
        this.render();
    };
    PhasorMapCtrl.prototype.changeThresholds = function (colorindex) {
        this.updateThresholdData(colorindex);
        //this.map.legend.update();
        this.render();
    };
    PhasorMapCtrl.prototype.updateThresholdData = function (colorindex) {
        var threshhold = this.panel.feature.thresholds[colorindex].split(",");
        while (_.size(this.panel.feature.colors[colorindex]) > _.size(threshhold) + 1) {
            // too many colors. remove the last one.
            this.panel.feature.colors[colorindex].pop();
        }
        while (_.size(this.panel.feature.colors[colorindex]) < _.size(threshhold) + 1) {
            // not enough colors. add one.
            var newColor = "rgba(50, 172, 45, 0.97)";
            this.panel.feature.colors[colorindex].push(newColor);
        }
    };
    PhasorMapCtrl.prototype.AddCustomLayer = function () {
        this.layerData.push(new Layer_1.default(this, "Custom Layer " + this.panel.customlayers.length, "geojson", {
            opacity: "1.0",
            zIndex: 0,
            minZoom: 0,
            maxZoom: 18
        }, "", true));
        this.panel.customlayers = this.layerData.map(function (item) { return item.Serialize(); });
        this.render();
    };
    PhasorMapCtrl.prototype.RemoveCustomLayer = function (id) {
        this.layerData.splice(id, 1);
        this.panel.customlayers = this.layerData.map(function (item) { return item.Serialize(); });
        this.render();
    };
    PhasorMapCtrl.prototype.ChangedlayerData = function (layer) {
        layer.changed = true;
        this.panel.customlayers = this.layerData.map(function (item) { return item.Serialize(); });
        this.render();
    };
    PhasorMapCtrl.prototype.ChangedMapOptions = function (map) {
        // This is counterintuitive But Custom Layer will update the controll so this is important
        map.forceReload = true;
        map.updateStaticLayer();
    };
    PhasorMapCtrl.prototype.RemovedMapOption = function (index) {
        this.panel.selectableMaps.splice(index, 1);
        this.map.updateStaticLayer();
    };
    PhasorMapCtrl.prototype.AddedMapOption = function () {
        this.panel.selectableMaps.push({ name: "Map " + this.panel.selectableMaps.length, map: this.mapOptions[0], forceReload: false });
        this.map.updateStaticLayer();
    };
    PhasorMapCtrl.prototype.link = function (scope, elem, attrs, ctrl) {
        var firstRender = true;
        ctrl.events.on("render", function () {
            render();
            ctrl.renderingCompleted();
        });
        function render() {
            // delay first render as the map panel sizing is bugged first render even though the element has correct height
            if (firstRender) {
                firstRender = false;
                setTimeout(render, 100);
                return;
            }
            var mapContainer = elem.find(".mapcontainer");
            if (mapContainer[0].id.indexOf("{{") > -1) {
                return;
            }
            if (!ctrl.map) {
                console.log("created map");
                var map = new worldmap_1.default(ctrl, mapContainer[0]);
                map.createMap();
                ctrl.map = map;
            }
            ctrl.map.resize();
            if (ctrl.mapCenterMoved) {
                ctrl.map.panToMapCenter();
            }
            if (!ctrl.map.legend && ctrl.panel.showLegend) {
                ctrl.map.createLegend();
            }
            ctrl.map.RedrawBaseLayer();
            ctrl.map.RedrawOverlays();
            ctrl.map.drawFeatures();
        }
    };
    PhasorMapCtrl.templateUrl = "partials/module.html";
    return PhasorMapCtrl;
}(sdk_1.MetricsPanelCtrl));
exports.default = PhasorMapCtrl;
//# sourceMappingURL=worldmap_ctrl.js.map