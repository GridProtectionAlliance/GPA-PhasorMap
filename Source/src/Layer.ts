import * as _ from 'lodash';
import * as L from './libs/leaflet';
import PhasorMapCtrl from './worldmap_ctrl';
import * as moment from 'moment';
import * as $ from "jquery";

const LayerTypes = ['geojson', 'tile', 'wms', 'text']

export { LayerTypes }

export default class Layer {
	ctrl: PhasorMapCtrl;
    type: 'geojson'|'tile'|'wms'|'text';
    dynamic: boolean;
    parameters: any;
    isactive: boolean;
    link: string;
    user: boolean;
    changed: boolean;
    name: string;
    data: any;
    layer: any;

    //parameters: layer and oppacity for WMS
    //              oppacity for tiles
    constructor(ctrl: PhasorMapCtrl, name: string, type: 'geojson' | 'tile' | 'wms' | 'text', param: any, link:string, isdynamic ? : boolean, isUser ? : boolean) {
        this.ctrl = ctrl;
        this.type = type;
        this.dynamic = (isdynamic == undefined) ? false : isdynamic;
        this.user = (isUser == undefined) ? false : isUser;
        this.parameters = param;
        this.isactive = (this.user) ? false : true;
        this.name = name;

        this.link = link;

        this.changed = true;
        this.data = null;

        this.layer = null;

        this.parameters.zIndex = (this.parameters.zIndex) ? this.parameters.zIndex : '1';
        this.parameters.oppacity = (this.parameters.oppacity) ? this.parameters.oppacity : '1.0';

    }

    getLink() {

        let link = this.link;

        if (this.ctrl.data.newestTS) {
            link = link.replace(/{LatestTS}/gi, moment(this.ctrl.data.newestTS).format("DD-MM-YYYYTHH-mm-ss"));
        }
        if (this.ctrl.data.oldesTS) {
            link = link.replace(/{OldestTS}/gi, moment(this.ctrl.data.oldesTS).format("DD-MM-YYYYTHH-mm-ss"));
        }

        return link
    }

    getData() {
        let ctrl = this;

        if (!ctrl.changed && ctrl.data != null && !ctrl.dynamic)
            return Promise.resolve();

        if (ctrl.type == 'wms' && !ctrl.changed)
            return Promise.resolve();

        if (ctrl.type == 'tile' && !ctrl.changed)
            return Promise.resolve();

        ctrl.changed = true;

        if (ctrl.type == 'text' || ctrl.type == "geojson") {
            return $.getJSON(this.getLink()).then(res => {
                ctrl.data = res;

            }).catch(err => {console.log("layer could not be retrieved")});

        }

        return Promise.resolve();
    }

    updateLayer() {

        this.changed = false;

        if (this.type == 'geojson') {
            this.layer = L.geoJSON(this.data, {
                pane: 'overlays',
                style: function (feature) {
                    let result = {};
                    if (feature.properties.stroke) {
                        result["color"] = feature.properties.stroke;
                        result["stroke"] = true;
                    }
                    if (feature.properties.weight) {
                        result["weight"] = feature.properties.weight;
                        result["stroke"] = true;
                    }
                    if (feature.properties.fillColor) {
                        result["fillColor"] = feature.properties.fillColor;
                        result["fill"] = true;
                    }

                    if (feature.properties.hasOwnProperty('fillOpacity')) {
                        result["fillOpacity"] = feature.properties.fillOpacity;
                        result["fill"] = true;

                        if (feature.properties.fillOpacity === 0) {
                            result['fill'] = false;
                        }
                    }

                    return result;
                }
            });
        }
        else if (this.type == 'wms') {
            this.layer = L.tileLayer.wms(this.getLink(), {
                transparent: true,
                layers: this.parameters.layer,
                format: 'image/png',
                opacity: this.parameters.oppacity,
                pane: 'overlays'
            });
        }
        else if (this.type == 'tile') {
            this.layer = L.tileLayer(this.getLink(), {
                reuseTiles: true,
                detectRetina: true,
                opacity: this.parameters.oppacity,
                pane: 'overlays'
            });
        }
        else if (this.type == 'text') {
            console.log("updating Text Layer")
            this.layer = (<any>window).L.layerGroup(this.CreateTextLayer(), { pane: 'overlays' })
        }
    }

    CreateTextLayer() {
        let result: any[] = [];
        this.data.forEach(item => {
            let txt = item.Text;

            while (txt.search(/\[.*\]/g) !== -1) {
                let tag = txt.match(/\[([^\]]*>?[^\]]*)\]/);

                let pointtag = tag[1];
                let str = '[' + pointtag + ']'
                let formatstring = "";

                if (pointtag.search(/>/g) !== -1) {
                    let lst = pointtag.split(">");
                    pointtag = lst[0];
                    formatstring = lst[1];
                }

                let index = _.find(this.ctrl.data.data, item => {
                    return item.key === pointtag;
                });
				
                if (index && index.hasOwnProperty('value')) {
                    if (formatstring !== "") {
                        txt = txt.replace(str, index.value.toFixed(parseInt(formatstring)));
                    }
                    else {
                        txt = txt.replace(str, index.value);
                    }

                }
                else {
                    txt = txt.replace(str, '');
                }
            }

            let myIcon = L.divIcon({
                html: txt,
                iconSize: [30, 10],
                iconAnchor: [15, 0]
            });
            let marker = L.marker([item.Latitude, item.Longitude], { icon: myIcon });

            result.push(marker);
        });
        return result;
    }

    Serialize() {
        let result = {
            type: this.type,
            dynamic: this.dynamic,
            user: this.user,
            parameters: this.parameters,
            name: this.name,
            link: this.link
        }

        return result;
    }

    static Deserialize(ctrl,jsonobject) {
        let result = new Layer(ctrl,"", "text", {}, "",);
        if (jsonobject.type)
            result.type = jsonobject.type;
        if (jsonobject.dynamic)
            result.dynamic = jsonobject.dynamic;
        if (jsonobject.user)
            result.user = jsonobject.user;
        if (jsonobject.parameters)
            result.parameters = jsonobject.parameters;
        if (jsonobject.name)
            result.name = jsonobject.name;
        if (jsonobject.link)
            result.link = jsonobject.link;

        return result

    }
}
