import { MetricsPanelCtrl } from "grafana/app/plugins/sdk";
import TimeSeries from "grafana/app/core/time_series2";
import appEvents from 'grafana/app/core/app_events';

import * as _ from "lodash";
import DataFormatter from "./data_formatter";
import "./css/worldmap-panel.css";
//import $ from "jquery";
import "./css/leaflet.css";
import PhasorMap from "./worldmap";
//import moment from 'moment';
import Layer from "./Layer";
import Map from "./Maps"


const panelDefaults = {
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
            ["rgba(245, 54, 54, 0.9)","rgba(237, 129, 40, 0.89)","rgba(50, 172, 45, 0.97)"],
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

const mapCenters = {
  "(0°, 0°)": { mapCenterLatitude: 0, mapCenterLongitude: 0 },
  "North America": { mapCenterLatitude: 40, mapCenterLongitude: -100 },
  "Europe": { mapCenterLatitude: 46, mapCenterLongitude: 14 },
  "West Asia": { mapCenterLatitude: 26, mapCenterLongitude: 53 },
  "SE Asia": { mapCenterLatitude: 10, mapCenterLongitude: 106 },
};

export default class PhasorMapCtrl extends MetricsPanelCtrl {
	static templateUrl = "partials/module.html";
    mapOptions = ['CartoDB Positron', 'CartoDB Dark', 'Open Topo Map', 'OpenStreetMap Mapnik', 'Esri NatGeo', 'Esri WorldShaded', 'Esri WorldPhysical', 'Stamen Toner', 'Stamen Terrain','Stamen Watercolor'];

    dataFormatter: DataFormatter;
    locations: any;

    saturationClass: string;
    map: any;

    series: any;
    data: any;
    mapCenterMoved: boolean;

    mapData: Map[];
    layerData: Layer[];

    /** @ngInject **/
    constructor($scope, $injector, contextSrv) {
        super($scope, $injector);

        //this.setMapProvider(contextSrv);
        _.defaults(this.panel, panelDefaults);

        this.dataFormatter = new DataFormatter(this);


        this.events.on("init-edit-mode", this.onInitEditMode.bind(this));
        this.events.on("data-received", this.onDataReceived.bind(this));
        this.events.on("panel-teardown", this.onPanelTeardown.bind(this));
        this.events.on("data-snapshot-load", this.onDataSnapshotLoad.bind(this));


        this.loadLocationDataFromFile();


        this.mapData = (this.panel.multiMaps) ? this.panel.selectableMaps.map(item => Map.Deserialize(this, item)) : [new Map(this, this.panel.mapBackground, {}, false)];
        
        if (this.mapData[0].maps.length == 0) {
            this.mapData[0].addMap(this.panel.mapBackground, 100);
        }

        this.panel.selectableMaps = (this.panel.selectableMaps) ? this.panel.selectableMaps : this.mapData.map(item => item.Serialize());

        this.layerData = (this.panel.customlayers.length > 0) ? this.panel.customlayers.map(item => Layer.Deserialize(this, item)) : [];

    }

    setNewMapBackground() {

        this.mapData[0].maps = [];
        this.mapData[0].transitions = [];
        this.mapData[0].addMap(this.panel.mapBackground, 100);
        this.mapData[0].name = this.panel.mapBackground;
        this.panel.selectableMaps = this.mapData.map(item => item.Serialize());

        this.map.mapChanged = true;
        this.render();
    }

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

  loadLocationDataFromFile(reload?) {
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
    } else if (this.panel.locationData === "OpenHistorian") {
        this.render();
    } 
  }

  reloadLocations(res) {
    this.locations = res;
    this.refresh();
  }
	
  onPanelTeardown() {
    if (this.map) {
      this.map.remove();
    }
  }

  onInitEditMode() {
    this.addEditorTab(
      "Phasormap",
      "public/plugins/grafana-pmumap-panel/partials/editor.html",
      2
    );
  }

	onDataReceived(dataList) {

        if (!dataList) {
          return;
        }

        // Start by getting the location data and updateing all dynamic map data
        let locationData = this.filterData(dataList);
        let locationPromise: any;

        try {

            if (this.panel.locationData === "json endpoint") {
                locationPromise = this.dataFormatter.setjsonendpoint(locationData);
            }
            else if (this.panel.locationData === "OpenHistorian") {
                locationPromise = this.dataFormatter.setOpenHistorian(locationData);
            } 
        
            let ctrl = this;

            locationPromise.then(function () {

                ctrl.series = ctrl.dataFormatter.ProcessData(dataList)

                ctrl.render()

                if (ctrl.dashboard.snapshot && ctrl.locations) {
                    ctrl.panel.snapshotLocationData = ctrl.locations;
                }

            })

        } catch (err) {
            appEvents.emit('alert-error', ['Data error', err.toString()])
	        console.log(err)

        }
  }

   filterData(data) {

        if (this.panel.filter == "") {
            return data;
        }

        
        let filter = this.panel.filter;
        try {
            filter = this.templateSrv.replace(this.panel.filter, this.panel.scopedVars, 'regex');
        } catch (e) {
            console.log('Map panel error: ', e);
        }

        let filtereddata: any[] = [];
        let re = new RegExp(filter);

        data.forEach(item => {
            if (re.test(item.target)) {
                filtereddata.push(item);
            }
        });

        return filtereddata
    }
    

  onDataSnapshotLoad(snapshotData) {
    this.onDataReceived(snapshotData);
  }



  seriesHandler(seriesData) {
    const series = new TimeSeries({
      datapoints: seriesData.datapoints,
      alias: seriesData.target
    });

    series.flotpairs = series.getFlotPairs(this.panel.nullPointMode);
    return series;
  }

  setNewMapCenter() {
    if (this.panel.mapCenter !== "custom") {
      this.panel.mapCenterLatitude =
        mapCenters[this.panel.mapCenter].mapCenterLatitude;
      this.panel.mapCenterLongitude =
        mapCenters[this.panel.mapCenter].mapCenterLongitude;
    }
    this.mapCenterMoved = true;
    this.render();
  }

  setZoom() {
	  this.map.setZoom(this.panel.initialZoom || 1);
  }

  toggleLegend() {
    if (!this.panel.showLegend) {
      this.map.removeLegend();
    }
    this.render();
  }

  toggleMouseWheelZoom() {
    this.map.setMouseWheelZoom();
    this.render();
  }

    setfeaturetype() {

        if (this.panel.featureType === '4-bit bar') {
            this.panel.feature.colors = [
                ["rgba(245, 54, 54, 0.9)", "rgba(237, 129, 40, 0.89)", "rgba(50, 172, 45, 0.97)"],
                ["rgba(245, 54, 54, 0.9)", "rgba(237, 129, 40, 0.89)", "rgba(50, 172, 45, 0.97)"],
                ["rgba(245, 54, 54, 0.9)", "rgba(237, 129, 40, 0.89)", "rgba(50, 172, 45, 0.97)"]
            ];
        }

        this.render();
    }
    
   

    
    changeThresholds(colorindex) {
        this.updateThresholdData(colorindex);
        //this.map.legend.update();
        this.render();
    }

    updateThresholdData(colorindex) {

        let threshhold = this.panel.feature.thresholds[colorindex].split(",");

        
        while (_.size(this.panel.feature.colors[colorindex]) > _.size(threshhold) + 1) {
            // too many colors. remove the last one.
            this.panel.feature.colors[colorindex].pop();
        }
        while (_.size(this.panel.feature.colors[colorindex]) < _.size(threshhold) + 1) {
             // not enough colors. add one.
            const newColor = "rgba(50, 172, 45, 0.97)";
            this.panel.feature.colors[colorindex].push(newColor);
        }
    } 

    AddCustomLayer() {
        this.layerData.push(
            new Layer(this, "Custom Layer " + this.panel.customlayers.length, "geojson",
                {
                    opacity: "1.0",
                    zIndex: 0,
                    minZoom: 0,
                    maxZoom: 18
                },
                "", true));
        this.panel.customlayers = this.layerData.map(item => item.Serialize());
        this.render();
    }

    RemoveCustomLayer(id) {
        this.layerData.splice(id, 1);
        this.panel.customlayers = this.layerData.map(item => item.Serialize());
        this.render();
    }

	ChangedlayerData(layer: Layer) {
        layer.changed = true;
        this.panel.customlayers = this.layerData.map(item => item.Serialize());
        this.render();
	}

	
	ChangedMapOptions(map) {
		// This is counterintuitive But Custom Layer will update the controll so this is important
		map.forceReload = true;
		map.updateStaticLayer();
	}

	RemovedMapOption(index) {
		this.panel.selectableMaps.splice(index, 1);
		this.map.updateStaticLayer();
	}

	AddedMapOption() {
		this.panel.selectableMaps.push({ name: "Map " + this.panel.selectableMaps.length, map: this.mapOptions[0], forceReload: false });
		this.map.updateStaticLayer();
	}

	
    link(scope, elem, attrs, ctrl) {
        let firstRender = true;

        ctrl.events.on("render", () => {
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

            const mapContainer = elem.find(".mapcontainer");

            if (mapContainer[0].id.indexOf("{{") > -1) {
                return;
            }
	  

            if (!ctrl.map) {
	            console.log("created map");
                const map = new PhasorMap(ctrl, mapContainer[0]);
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
    }
}
