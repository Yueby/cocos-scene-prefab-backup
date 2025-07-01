import { createApp } from 'vue';
import { state } from './pina';

import { ElMessage } from 'element-plus';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import './style.css';

import App from './App.vue';
import { keyAppRoot, keyMessage } from './provide-inject';

import type { MessageOptions } from 'element-plus';
import { CocosAsset } from '../types';
import { logger } from '../utils/logger';

const weakMap = new WeakMap();

export default Editor.Panel.define({
	template: '<div id="app" class="dark"></div>', // 只留一个 div 用于 vue 的挂载
	$: {
		root: '#app'
	},
	ready() {
		if (!this.$.root) return;

		const app = createApp(App);
		app.provide(keyAppRoot, this.$.root);
		app.provide(keyMessage, (options: MessageOptions = {}) => {
			if (typeof options === 'string') {
				options = { message: options };
			}
			options.appendTo ??= this.$.root as HTMLElement;
			return ElMessage(options);
		});
		app.mount(this.$.root);

		weakMap.set(this, app);
	},
	close() {
		const app = weakMap.get(this);
		app?.unmount?.();
	},
	methods: {
		async assetChange(uuid: string, data: CocosAsset) {
			logger.log(`received assetChange ${uuid}`, data);
			setTimeout(() => {
				state.refreshFlag = !state.refreshFlag;
			}, 200);
		}
	}
});
