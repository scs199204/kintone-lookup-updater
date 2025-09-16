(function (PLUGIN_ID) {
  'use strict';
  const SOURCE_APP_ID = kintone.app.getId();

  // Get plugin configuration settings
  const CONFIG = kintone.plugin.app.getConfig(PLUGIN_ID);
  if (!CONFIG) return false;

  // Get each settings
  const CONFIG_TARGET_APP_MODE = CONFIG.targetAppMode;
  let CONFIG_TARGET_APP = CONFIG.targetApp;
  const CONFIG_TARGET_FIELD = CONFIG.targetField;
  const CONFIG_TARGET_DATE_MODE = CONFIG.targetDateMode;
  const CONFIG_TARGET_DATE_CONDITION = CONFIG.targetDateCondition;
  const CONFIG_TARGET_DATE = CONFIG.targetDate;

  if (CONFIG['targetApp']) {
    try {
      CONFIG_TARGET_APP = JSON.parse(CONFIG['targetApp']);
    } catch (e) {
      console.error('JSONパースに失敗しました。', e);
      CONFIG_TARGET_APP = [{ id: 1, appId: '', appName: '' }];
    }
  } else {
    CONFIG_TARGET_APP = [{ id: 1, appId: '', appName: '' }];
  }

  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  // 自作のスピナーとオーバーレイ用のスタイルを定義
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  const createLoadingOverlay = () => {
    // すでに存在する場合は何もしない
    if (document.getElementById('loading-overlay')) return;

    // オーバーレイ要素を作成
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '1000';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';

    // スピナー要素を作成
    const spinner = document.createElement('div');
    spinner.id = 'loading-spinner';
    spinner.style.border = '4px solid #f3f3f3';
    spinner.style.borderTop = '4px solid #3498db';
    spinner.style.borderRadius = '50%';
    spinner.style.width = '40px';
    spinner.style.height = '40px';
    spinner.style.animation = 'spin 1s linear infinite';

    // スピナーのアニメーションを定義するスタイルタグを作成
    const style = document.createElement('style'); //spinという名前のアニメーションを定義し、アニメーションの開始（0%）から終了（100%）までの間に、要素を0度から360度まで回転させる
    style.innerHTML = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;

    document.head.appendChild(style);
    overlay.appendChild(spinner);
    document.body.appendChild(overlay);
  };

  const showLoading = () => {
    createLoadingOverlay();
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'flex';
  };

  const hideLoading = () => {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
  };

  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  /** 自アプリのフィールドから、重複禁止のフィールドのみを抽出
   * @returns {array[object]} 重複禁止のフィールド(フィールドコード、ラベル、フィールドタイプ)
   */
  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  const getSourceAppField = async () => {
    const sourceApps = [];
    //ルックアップの参照元に指定できるフィールドタイプかを判定
    const isLookupTargetFieldType = (field) => {
      const fieldTypeArray = ['SINGLE_LINE_TEXT', 'NUMBER', 'CALC', 'LINK', 'RECORD_NUMBER']; //ルックアップ参照元に設定できるフィールド
      return fieldTypeArray.some((targetFieldType) => targetFieldType == field);
    };
    try {
      const properties = await kintone.app.getFormFields(); //フィール情報の取得
      for (const fieldCode in properties) {
        const field = properties[fieldCode];
        //重複禁止のフィールドかつ、ルックアップ参照元に設定できるフィールドで、プラグインの設定が「重複禁止のフィールド全て」か、指定されたフィールドの場合抽出
        if (field?.unique && isLookupTargetFieldType(field.type) && (CONFIG_TARGET_FIELD == 'sdpDropDownItemAllUniqueField' || CONFIG_TARGET_FIELD == field.code)) {
          sourceApps.push({ fieldCode: field.code, name: field.label, type: field.type });
        }
      }
      return sourceApps;
    } catch (e) {
      console.error(`アプリID: ${SOURCE_APP_ID} のフォーム情報取得に失敗しました。`, e);
      throw new Error(`アプリのフィールド情報取得に失敗しました。エラー: ${e.message}`);
    }
  };

  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  /** 重複禁止のフィールドの値を取得
   * @param {array[object]} sourceAppUniqueField 重複禁止のフィールド(getSourceAppFieldの戻り値)
   * @returns {object} 重複禁止のフィールドの値をフィールド毎に配列で保持
   */
  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  const getSourceAppRecords = async (sourceAppUniqueField) => {
    const valueArray = {}; //フィールド毎に保持している値を配列で持つ
    for (const field of sourceAppUniqueField) {
      valueArray[field.fieldCode] = []; //重複禁止のフィールドの場合、配列作成
    }
    let offset = 0;
    const limit = 500;
    try {
      while (true) {
        const recordsResp = await kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', { app: SOURCE_APP_ID, offset, limit }); //500件ずつレコード取得
        for (const record of recordsResp.records) {
          for (const field of sourceAppUniqueField) {
            valueArray[field.fieldCode].push(record[field.fieldCode].value); //重複禁止のフィールドの値を配列に追加
          }
        }
        if (recordsResp.records.length < limit) break;
        offset += limit; //レコードが500件の場合、繰り返す
      }
    } catch (e) {
      console.error(`アプリID: ${SOURCE_APP_ID} のレコード取得に失敗しました。`, e);
      throw new Error(`アプリのレコード取得に失敗しました。エラー: ${e.message}`);
    }

    const result = {};
    for (const [key, value] of Object.entries(valueArray)) {
      result[key] = new Set(value); //存在判定を効率的に行うためにSetへ変換
    }
    return result;
  };

  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  /** サブドメイン内の全てのアプリから、ルックアップで参照しているアプリを検索
   * @param {array[object]} sourceAppUniqueField 重複禁止のフィールド(getSourceAppFieldの戻り値)
   * @returns {array[object]} アプリ毎の配列、更に更新対象フィールドを配列で持つ
   */
  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  const findTargetApps = async (sourceAppUniqueField) => {
    let allApps = [];
    let offset = 0;
    const limit = 100;

    /** ルックアップフィールドで、自アプリの重複禁止のフィールドを参照しているかチェック
     * @param {object} field 判定対象のフィールド(record.properties[fieldCode]もしくは、record.properties[SUBTABLE].fields[fieldCode])
     * @param {array[object]} sourceAppUniqueField 重複禁止のフィールド(getSourceAppFieldの戻り値)
     */
    const isLookupTargetField = (field, sourceAppUniqueField) => {
      return (
        field.hasOwnProperty('lookup') && field.lookup.relatedApp.app === String(SOURCE_APP_ID) && sourceAppUniqueField.some((sourcefield) => sourcefield.fieldCode === field.lookup.relatedKeyField)
      );
    };

    try {
      // アプリの一覧を全件取得
      while (true) {
        const resp = await kintone.api(kintone.api.url('/k/v1/apps.json', true), 'GET', { offset, limit }); //全てのアプリ
        //条件に合致する要素のみ配列に追加
        const filteredApps = resp.apps.filter((respRec) => {
          if (CONFIG_TARGET_APP_MODE === 'all') {
            return respRec.appId != SOURCE_APP_ID; //自アプリを除く全て
          }
          if (CONFIG_TARGET_APP_MODE === 'specify') {
            return CONFIG_TARGET_APP.some((app) => app.appId == respRec.appId); //指定したアプリのみで指定されている
          }
          if (CONFIG_TARGET_APP_MODE === 'except') {
            return !CONFIG_TARGET_APP.some((app) => app.appId == respRec.appId); //指定したアプリ以外で指定されていない
          }
          return false;
        });
        allApps = allApps.concat(filteredApps);

        if (resp.apps.length < limit) break;
        offset += limit;
      }
    } catch (e) {
      console.error('アプリ一覧の取得に失敗しました。', e);
      throw new Error(`アプリ一覧の取得に失敗しました。エラー: ${e.message}`);
    }
    // 取得したアプリの中から、ルックアップフィールドを持つアプリを抽出
    const targetApps = [];
    for (const app of allApps) {
      try {
        const addItem = [];
        const formResp = await kintone.api(kintone.api.url('/k/v1/app/form/fields.json', true), 'GET', { app: app.appId }); //アプリのフィールド
        for (const fieldCode in formResp.properties) {
          const field = formResp.properties[fieldCode];
          if (isLookupTargetField(field, sourceAppUniqueField)) {
            addItem.push({ value: fieldCode, relatedKeyField: field.lookup.relatedKeyField }); //更新対象フィールドに追加
          } else if (field.type == 'SUBTABLE') {
            for (const subtableFieldCode in field.fields) {
              const subtableField = field.fields[subtableFieldCode]; //サブテーブルの場合、「properties.フィールドコード.fields」を判定
              if (isLookupTargetField(subtableField, sourceAppUniqueField)) {
                addItem.push({ value: subtableFieldCode, tableName: field.code, relatedKeyField: subtableField.lookup.relatedKeyField }); //サブテーブルの更新対象フィールド
              }
            }
          }
        }
        if (addItem.length > 0) {
          targetApps.push({ appId: app.appId, appName: app.name, fieldCode: addItem }); //アプリ毎の配列で、更に更新対象フィールドを配列で持つ
        }
      } catch (e) {
        console.error(`アプリID: ${app.appId} のフォーム情報取得に失敗しました。`, e);
        throw new Error(`アプリID: ${app.appId} のフォーム情報取得に失敗しました。エラー: ${e.message}`);
      }
    }
    return targetApps;
  };

  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  /** 参照先アプリのレコードを更新
   * @param {array[object]} targetApps サブドメイン内の、更新対象フィールド(findTargetAppsの戻り値)
   * @param {object} sourceAppUniqueFieldValue 自アプリの重複禁止のフィールドの値(getSourceAppRecordsの戻り値)
   */
  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  const updateTargetRecords = async (targetApps, sourceAppUniqueFieldValue) => {
    let errorCount = 0;

    // 参照元レコードのキーを持つレコードを検索
    const query = queryConditionGenerate(CONFIG_TARGET_DATE_MODE, CONFIG_TARGET_DATE_CONDITION, CONFIG_TARGET_DATE);
    let offset = 0;
    const limit = 500;

    // 各アプリに対して個別に更新リクエストを送信
    for (const app of targetApps) {
      /** 1アプリ更新用の配列 */
      const recordsToUpdate = [];
      try {
        while (true) {
          const recordsResp = await kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', { app: app.appId, query, offset, limit }); //更新対象のアプリを500件ずつ読込む

          // 取得したレコードを更新リクエストに追加
          for (const record of recordsResp.records) {
            /** 1レコード更新用のオブジェクト */
            const addItem = {
              id: record.$id.value,
              record: {},
            };
            for (const targetFieldCode of app.fieldCode) {
              //サブテーブルの場合
              if (targetFieldCode.hasOwnProperty('tableName')) {
                /** サブテール更新用の配列 */
                const addTableItem = [];
                //サブテーブルの全ての行
                for (const row of record[targetFieldCode.tableName].value) {
                  //値が処理時点で存在している(ルックアップで値を取得できる)か、値が存在しない場合は更新しない
                  if (row.value[targetFieldCode.value].value && sourceAppUniqueFieldValue[targetFieldCode.relatedKeyField].has(row.value[targetFieldCode.value].value)) {
                    /** サブテールを1行更新するためのオブジェクト */
                    const addTableItemValue = {
                      id: row.id,
                      value: {
                        [targetFieldCode.value]: { value: row.value[targetFieldCode.value].value },
                      },
                    };
                    addTableItem.push(addTableItemValue); //サブテーブル更新用配列へ追加
                  }
                }
                //サブテーブル内に更新する行が1行でもあれば追加
                if (addTableItem.length > 0) {
                  addItem.record[targetFieldCode.tableName] = { value: addTableItem }; //ルックアップフィールドを更新(サブテーブル)
                }
              } else {
                //値が処理時点で存在している(ルックアップで値を取得できる)か判定、値が存在しない場合(参照元のレコードが削除された場合など)は更新しない
                if (sourceAppUniqueFieldValue[targetFieldCode.relatedKeyField].has(record[targetFieldCode.value].value)) {
                  addItem.record[targetFieldCode.value] = { value: record[targetFieldCode.value].value }; //ルックアップフィールドを更新(同じ値)
                }
              }
            }
            if (Object.keys(addItem.record).length > 0) {
              recordsToUpdate.push(addItem);
            }
          }
          if (recordsResp.records.length < limit) break;
          offset += limit;
        }
      } catch (e) {
        console.error(`アプリ ${app.appName} (${app.appId}) のレコード取得に失敗しました。`, e);
        throw new Error(`アプリ ${app.appName} (${app.appId}) のレコード取得に失敗しました。エラー: ${e.message}`);
      }
      // レコードが存在する場合、一括更新APIを呼び出す
      if (recordsToUpdate.length > 0) {
        const body = {
          app: app.appId,
          records: recordsToUpdate,
        };
        try {
          //body(1アプリ)→recordsToUpdate(全てのレコード)→addItem(1レコード)→addTableItem(1テーブル→addTableItemValue(1行)
          await kintone.api(kintone.api.url('/k/v1/records.json', true), 'PUT', body);
          console.log(`アプリ ${app.appName} (${app.appId}) のレコードを更新しました。`);
        } catch (e) {
          console.error(`アプリ ${app.appName} (${app.appId}) のレコード更新に失敗しました。`, e);
          errorCount += 1;
          continue;
        }
      }
    }
    return errorCount;
  };

  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  /** レコードを読み込むための条件作成(抽出対象とする日付および条件等)
   * @param {string} mode 「全て」、「作成日」、「更新日」から選択した値
   * @param {string} condition 「指定日」、「指定日以降」、「指定日以前」から選択した値
   * @param {date} date 日付
   * @returns {string} 作成した条件(kintone REST APIのquery)
   */
  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  function queryConditionGenerate(mode, condition, date) {
    let result = '';
    if (mode == 'all') {
      return ''; //全ての場合はクエリは不要
    }

    let targetField = '';
    if (mode == 'createDate') {
      targetField = '作成日時';
    } else if (mode == 'updateDate') {
      targetField = '更新日時';
    }

    const baseDate = new Date(date); // JST(日本標準時)の日付をDateオブジェクトに変換
    // 条件に応じてクエリを生成(日本時間（JST）の2024年3月22日14時00分は、「2024-03-22T05:00:00Z」と表す)
    if (condition === 'later') {
      const startOfDayUTC = new Date(baseDate.setHours(0, 0, 0, 0)).toISOString(); // 指定日（00:00:00 JST）をUTCに変換
      result = `${targetField} >= "${startOfDayUTC}"`;
    } else if (condition === 'before') {
      const endOfDayUTC = new Date(baseDate.setHours(23, 59, 59, 999)).toISOString(); // 指定日（23:59:59.999 JST）をUTCに変換
      result = `${targetField} <= "${endOfDayUTC}"`;
    } else {
      const startOfDayUTC = new Date(baseDate.setHours(0, 0, 0, 0)).toISOString(); // 指定日全体をカバー(00:00:00～25:59:59.999)
      const endOfDayUTC = new Date(baseDate.setHours(23, 59, 59, 999)).toISOString();
      result = `${targetField} >= "${startOfDayUTC}" and ${targetField} <= "${endOfDayUTC}"`;
    }

    return result;
  }

  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  // レコード一覧の表示後イベント
  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  kintone.events.on('app.record.index.show', (event) => {
    // 増殖バグを防ぐ
    if (document.getElementById('menu_button') !== null) {
      return false;
    }

    // ボタンを作成
    const menuButton = document.createElement('button');
    menuButton.id = 'menu_button';
    menuButton.innerText = 'ルックアップ更新';
    menuButton.classList.add('kintoneplugin-button-dialog-ok');

    // ボタンクリック時の処理
    menuButton.onclick = async () => {
      menuButton.disabled = true; // 処理開始時にボタンを無効化
      showLoading(); // 処理開始時にローディングを表示

      try {
        const sourceAppUniqueField = await getSourceAppField(); //自アプリのフィールド情報を取得
        const sourceAppUniqueFieldValue = await getSourceAppRecords(sourceAppUniqueField); //自アプリの重複禁止のフィールドの値を取得

        const targetApps = await findTargetApps(sourceAppUniqueField); // 参照先アプリを検索
        if (targetApps.length > 0) {
          const errorCount = await updateTargetRecords(targetApps, sourceAppUniqueFieldValue); // 参照先アプリのレコードを更新
          console.log(`ルックアップの更新が完了しました。エラー件数：${errorCount}件`);
          alert(`ルックアップの更新が完了しました。エラー件数：${errorCount}件`);
        } else {
          alert('ルックアップを更新する対象のアプリが見つかりませんでした。');
        }
      } catch (error) {
        console.error('ルックアップの更新中にエラーが発生しました:', error);
        alert(`ルックアップに失敗しました。エラー: ${error.message}。詳細は開発者ツールを確認してください。`);
      } finally {
        hideLoading(); // 成功・失敗にかかわらず、ローディングを非表示
        menuButton.disabled = false; // ボタンを再度有効化
      }
    };
    // レコード一覧のメニューの右側の要素を取得し、ボタンを配置
    const headerMenuSpace = kintone.app.getHeaderMenuSpaceElement();
    headerMenuSpace.appendChild(menuButton);

    return event;
  });
})(kintone.$PLUGIN_ID);
