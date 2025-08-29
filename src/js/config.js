import { createApp } from 'vue';
import kintoneLookupUpdaterConfigApp from '../components/kintoneLookupUpdaterConfigApp.vue';

(async function (PLUGIN_ID) {
  'use strict';
  const SOURCE_APP_ID = kintone.app.getId();
  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  /** 自アプリのフィールドから、重複禁止のフィールドのみを抽出
   * @returns {array[object]} 重複禁止のフィールド(フィールドコード、ラベル、フィールドタイプ)
   */
  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  const getSourceAppField = async (targetFieldTypes) => {
    const sourceApps = [];
    try {
      const formResp = await kintone.api(kintone.api.url('/k/v1/app/form/fields.json', true), 'GET', { app: SOURCE_APP_ID }); //フィールドを取得
      for (const fieldCode in formResp.properties) {
        const field = formResp.properties[fieldCode];
        const isTargetField = targetFieldTypes.some((item) => item == field.type);
        if (field?.unique && isTargetField) {
          sourceApps.push({ fieldCode: field.code, name: field.label, type: field.type }); //重複禁止のフィールドのみ抽出
        }
      }
      return sourceApps;
    } catch (e) {
      console.error(`アプリID: ${SOURCE_APP_ID} のフォーム情報取得に失敗しました。`, e);
      throw new Error(`アプリのフィールド情報取得に失敗しました。エラー: ${e.message}`);
    }
  };

  //★★★★★★★★★★★★★★★★★★★★★★★★★★★
  /** ドロップダウン作成(サブテーブル内のフィールドは除く)
   * @param {object[]} fieldArray ドロップダウンを作成する元情報
   * @returns {object[]} ドロップダウンを作成するための配列
   */
  //★★★★★★★★★★★★★★★★★★★★★★★★★★★
  function setDropDown(fieldArray) {
    const result = [{ id: 'sdpDropDownItemAllUniqueField', name: '重複禁止のフィールド全て', type: '' }];
    const filteredFields = fieldArray.filter((field) => !field.subtableCode); //サブテーブル内のフィールドは除く
    for (const field of filteredFields) {
      result.push({
        id: field.fieldCode,
        name: escapeHtml(field.fieldCode),
        type: field.type,
      });
    }
    return result;
  }

  //★★★★★★★★★★★★★★★★★★★★★★★★★★★
  /** サブドメイン内の全てのアプリを取得
   * @returns {array[object]} アプリの一覧
   */
  //★★★★★★★★★★★★★★★★★★★★★★★★★★★
  async function getAllApp() {
    let allApps = [];
    let offset = 0;
    const limit = 100;

    try {
      // アプリの一覧を全件取得
      while (true) {
        const resp = await kintone.api(kintone.api.url('/k/v1/apps.json', true), 'GET', { offset, limit }); //全てのアプリ
        allApps = allApps.concat(resp.apps);
        if (resp.apps.length < limit) break;
        offset += limit;
      }
    } catch (e) {
      console.error('アプリ一覧の取得に失敗しました。', e);
      throw new Error(`アプリ一覧の取得に失敗しました。エラー: ${e.message}`);
    }
    return allApps;
  }

  //★★★★★★★★★★★★★★★★★★★★★★★★★★★
  //★ エスケープ文字の置換関数 (async/await の外側で定義)
  //★★★★★★★★★★★★★★★★★★★★★★★★★★★
  function escapeHtml(htmlstr) {
    // HTMLエスケープ文字を正しく修正します
    return htmlstr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  //★★★★★★★★★★★★★★★★★★★★★★★★★★★
  //★ 非同期処理（設定取得とフィールド情報取得）を Vue アプリ作成より前に行う
  //★★★★★★★★★★★★★★★★★★★★★★★★★★★
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

  const fieldTypeArray = ['SINGLE_LINE_TEXT', 'NUMBER', 'CALC', 'LINK', 'RECORD_NUMBER'];
  const TargetFields = await getSourceAppField(fieldTypeArray);
  const optionTargetFields = setDropDown(TargetFields);
  const allApps = await getAllApp();

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
    optionTargetFields: optionTargetFields,
    allApps: allApps,
  });
  const vm = app.mount('#app');
})(kintone.$PLUGIN_ID);
