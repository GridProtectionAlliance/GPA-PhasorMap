/* eslint import/no-extraneous-dependencies: 0 */
import {loadPluginCss} from 'grafana/app/plugins/sdk';
import PhasorMapCtrl from './worldmap_ctrl';

loadPluginCss({
	dark: 'plugins/grafana-pmumap-panel/css/worldmap.dark.css',
	light: 'plugins/grafana-pmumap-panel/css/worldmap.light.css'
});

export {
	PhasorMapCtrl as PanelCtrl
};
