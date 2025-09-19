import { createApp } from 'vue';
import kintoneLookupUpdaterConfigApp from '../components/kintoneLookupUpdaterConfigApp.vue';

(async function (PLUGIN_ID) {
  'use strict';
  const config = kintone.plugin.app.getConfig(PLUGIN_ID);

  // Vueコンポーネントに渡す初期データとオプション
  const initialConfig = {
    targetAppMode: config.targetAppMode || '',
    targetApp: config.targetApp ? JSON.parse(config.targetApp) : [{ id: 1, appId: '', appName: '' }],
    targetField: config.targetField || '',
    targetDateMode: config.targetDateMode || '',
    targetDateCondition: config.targetDateCondition || '',
    targetDate: config.targetDate || '',
  };

  let appElement = document.getElementById('app');
  if (!appElement) {
    appElement = document.createElement('div');
    appElement.id = 'app';
    document.body.appendChild(appElement);
  }
  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  //Vueのオブジェクト作成 (setup 関数は async にしない)
  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  const app = createApp(kintoneLookupUpdaterConfigApp, {
    initialConfig: initialConfig,
  });
  const vm = app.mount('#app');
})(kintone.$PLUGIN_ID);
