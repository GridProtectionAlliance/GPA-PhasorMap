"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint import/no-extraneous-dependencies: 0 */
var sdk_1 = require("grafana/app/plugins/sdk");
var worldmap_ctrl_1 = require("./worldmap_ctrl");
exports.PanelCtrl = worldmap_ctrl_1.default;
sdk_1.loadPluginCss({
    dark: 'plugins/grafana-pmumap-panel/css/worldmap.dark.css',
    light: 'plugins/grafana-pmumap-panel/css/worldmap.light.css'
});
//# sourceMappingURL=module.js.map