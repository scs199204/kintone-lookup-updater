<template>
  <div class="plugin-config-container">
    <h1 class="page-title">ルックアップフィールド更新プラグイン設定</h1>

    <div class="setting-section">
      <h2 class="section-title">対象アプリ</h2>
      <div v-if="hasError" class="error-message">
        <p>{{ errorMessage }}</p>
      </div>

      <div class="setting-item">
        <label class="label-text">更新対象アプリ<span class="required-mark">*</span></label>
        <select v-model="targetAppMode" @change="targetAppModeChange">
          <option v-for="itemTargetAppMode in optionTargetAppMode" :value="itemTargetAppMode.id" :key="itemTargetAppMode.id">
            {{ itemTargetAppMode.name }}
          </option>
        </select>
      </div>
    </div>

    <hr class="section-divider" />

    <div class="setting-section">
      <h2 class="section-title">対象アプリ一覧</h2>
      <div v-if="hasErrorApp" class="error-message">
        <p>{{ errorMessageApp }}</p>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th class="field-header"><span class="title">アプリＩＤ</span></th>
            <th class="field-header"><span class="title">アプリ名</span></th>
            <th class="table-header-action"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(targetAppRow, index) in targetApp" :key="targetAppRow.id">
            <td>
              <input
                type="number"
                v-model="targetAppRow.appId"
                @change="targetAppIdChange(index)"
                class="text-input"
                :class="{ 'input-error': isDuplicateError(targetAppRow, targetApp) || isAppNotFound(targetAppRow) || isSelf(targetAppRow) }"
              />
            </td>
            <td>
              <input type="text" :value="targetAppRow.appName" class="text-input" readonly />
            </td>
            <td class="table-actions">
              <button @click="addItem(index)" type="button" class="action-icon-button add-button" title="行を追加"></button>
              <button @click="removeItem(index)" type="button" class="action-icon-button remove-button" title="行を削除"></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <hr class="section-divider" />

    <div class="setting-section">
      <h2 class="section-title">対象フィールド</h2>
      <div v-if="hasErrorField" class="error-message">
        <p>{{ errorMessageField }}</p>
      </div>

      <div class="setting-item">
        <label class="label-text">対象フィールドコード<span class="required-mark">*</span></label>
        <select v-model="targetField">
          <option v-for="itemTargetField in optionTargetFields" :value="itemTargetField.id" :key="itemTargetField.id">
            {{ itemTargetField.name }}
          </option>
        </select>
      </div>
    </div>

    <hr class="section-divider" />

    <div class="setting-section">
      <h2 class="section-title">対象日付指定</h2>
      <div v-if="hasErrorDate" class="error-message">
        <p>{{ errorMessageDate }}</p>
      </div>
      <div class="setting-item">
        <label class="label-text">更新対象日付<span class="required-mark">*</span></label>
        <select v-model="targetDateMode">
          <option v-for="itemTargetDateMode in optionTargetDateMode" :value="itemTargetDateMode.id" :key="itemTargetDateMode.id">
            {{ itemTargetDateMode.name }}
          </option>
        </select>
      </div>

      <div class="setting-item">
        <label class="label-text">日付条件</label>
        <select v-model="targetDateCondition">
          <option v-for="itemTargetDateCondition in optionTargetDateCondition" :value="itemTargetDateCondition.id" :key="itemTargetDateCondition.id">
            {{ itemTargetDateCondition.name }}
          </option>
        </select>
      </div>

      <div class="setting-item">
        <label class="label-text">日付</label>
        <input type="date" v-model="targetDate" />
      </div>
    </div>

    <div class="button-group">
      <button @click="register" class="action-button primary-button">登録</button>
      <button @click="cancel" class="action-button secondary-button" type="button">キャンセル</button>
    </div>

    <div v-if="showSuccessModal" class="custom-modal-overlay">
      <div class="custom-modal">
        <p>プラグインの設定が保存されました！アプリを更新してください！</p>
        <button @click="closeSuccessModal" class="action-button primary-button">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const APP_ID = kintone.app.getId();

//config.jsから渡される引数(変数、関数)
const props = defineProps({
  initialConfig: Object,
  optionTargetFields: Array,
  allApps: Array,
});

//更新対象アプリ
const optionTargetAppMode = ref([
  { id: 'all', name: '全て' },
  { id: 'specify', name: '指定したアプリのみ' },
  { id: 'except', name: '指定したアプリ以外' },
]);

//更新対象日付
const optionTargetDateMode = ref([
  { id: 'all', name: '全て' },
  { id: 'createDate', name: '作成日' },
  { id: 'updateDate', name: '更新日' },
]);

//日付条件
const optionTargetDateCondition = ref([
  { id: 'same', name: '指定日' },
  { id: 'later', name: '指定日以後' },
  { id: 'before', name: '指定日以前' },
]);

//リアクティブな変数(.valueでアクセス)
const targetAppMode = ref(props.initialConfig.targetAppMode);
const targetApp = ref(props.initialConfig.targetApp);
const targetField = ref(props.initialConfig.targetField);
const targetDateMode = ref(props.initialConfig.targetDateMode);
const targetDateCondition = ref(props.initialConfig.targetDateCondition);
const targetDate = ref(props.initialConfig.targetDate);

const optionTargetFields = ref(props.optionTargetFields); //重複禁止が設定されたフィールド
const allApps = ref(props.allApps); //サブドメイン内の全てのアプリ

const hasError = ref(false);
const hasErrorApp = ref(false);
const hasErrorField = ref(false);
const hasErrorDate = ref(false);

const errorMessage = ref('');
const errorMessageApp = ref('');
const errorMessageField = ref('');
const errorMessageDate = ref('');

const showSuccessModal = ref(false); // カスタムモーダルの表示用

// テーブル内でのフィールド重複のバリデーション
const isDuplicateError = (param, array) => {
  const allTargetAppId = array.map((p) => p.appId).filter((f) => f !== '');
  const count = allTargetAppId.filter((f) => f === param.appId).length; //同じアプリIDを複数行で指定していないか
  return count > 1;
};

// アプリが存在しないかどうかのバリデーション
const isAppNotFound = (param) => {
  return param.appName === '該当アプリは存在しません。';
};

const isSelf = (param) => {
  return param.appName === '自アプリを対象にはできません。';
};

// 登録時に全体のエラーチェック
const validate = () => {
  const errors = {};
  errors.app = [];
  errors.appTable = [];
  errors.field = [];
  errors.date = [];

  // ヘルパー関数: エラーメッセージを設定
  const setErrors = (errorArray, hasErrorRef, errorMessageRef) => {
    if (errorArray.length > 0) {
      hasErrorRef.value = true;
      errorMessageRef.value = errorArray.join('\n');
      return false;
    }
    return true;
  };

  // 全てのエラー状態をリセット
  hasError.value = hasErrorApp.value = hasErrorField.value = hasErrorDate.value = false;
  errorMessage.value = errorMessageApp.value = errorMessageField.value = errorMessageDate.value = '';

  // 必須項目のチェック
  if (!targetAppMode.value) {
    errors.app.push('更新対象アプリは必須項目です。');
  } else {
    // targetAppModeが 'all' でない場合のチェック
    if (targetAppMode.value !== 'all' && (targetApp.value.length === 0 || targetApp.value[0].appId === '')) {
      errors.appTable.push('更新対象アプリが「全て」以外の場合、対象アプリ一覧の入力は必須です。');
    }
  }

  if (!targetField.value) {
    errors.field.push('対象フィールドは必須項目です。');
  }

  if (!targetDateMode.value) {
    errors.date.push('更新対象日付は必須項目です。');
  } else if (targetDateMode.value !== 'all') {
    if (!targetDateCondition.value) {
      errors.date.push('更新対象日付が「全て」以外の場合、日付条件は必須です。');
    }
    if (!targetDate.value) {
      errors.date.push('更新対象日付が「全て」以外の場合、日付は必須です。');
    }
  }

  // 対象アプリ一覧のアプリID変更時…targetAppRow.appId変更時に:classが再評価される(isDuplicateError実行)
  for (const targetAppRow of targetApp.value) {
    if (isDuplicateError(targetAppRow, targetApp.value)) {
      errors.appTable.push('同じアプリＩＤを設定しています。');
      break;
    }
    if (isAppNotFound(targetAppRow)) {
      errors.appTable.push('存在するアプリを指定してください。');
      break;
    }
    if (isSelf(targetAppRow)) {
      errors.appTable.push('自アプリの行を削除してください。');
      break;
    }
  }

  const result1 = setErrors(errors.app, hasError, errorMessage);
  const result2 = setErrors(errors.appTable, hasErrorApp, errorMessageApp);
  const result3 = setErrors(errors.field, hasErrorField, errorMessageField);
  const result4 = setErrors(errors.date, hasErrorDate, errorMessageDate);

  return result1 && result2 && result3 && result4;
};

//targetAppModeが変更された際の処理
const targetAppModeChange = () => {
  // 特に処理がない場合は空のままでOK
};

//対象アプリ一覧のアプリID変更時
const targetAppIdChange = (index) => {
  const appId = targetApp.value[index].appId;
  targetApp.value[index].appName = '';
  if (!appId) {
    return;
  }
  const appName = allApps.value.find((item) => item.appId == appId);
  if (!appName) {
    targetApp.value[index].appName = '該当アプリは存在しません。';
  } else if (appId == APP_ID) {
    targetApp.value[index].appName = '自アプリを対象にはできません。';
  } else {
    targetApp.value[index].appName = appName.name;
  }
};

//登録ボタンクリック時
const register = () => {
  if (!validate()) {
    return;
  }

  try {
    //CONFIGに設定内容を保存する
    const param = {
      targetAppMode: String(targetAppMode.value),
      targetField: targetField.value,
      targetDateMode: targetDateMode.value,
      targetDateCondition: targetDateCondition.value,
      targetDate: targetDate.value,
      targetApp: JSON.stringify(targetApp.value),
    };

    kintone.plugin.app.setConfig(param, () => {
      showSuccessModal.value = true;
    });
  } catch (e) {
    console.error('name: ' + e.name + ' message: ' + e.message);
    hasError.value = true;
    errorMessage.value = '設定の保存中にエラーが発生しました。';
  }
};

//モーダルウィンドウを閉じて、設定画面へ遷移
const closeSuccessModal = () => {
  showSuccessModal.value = false;
  window.location.href = '/k/admin/app/flow?app=' + APP_ID;
};

//キャンセルボタンクリック時
const cancel = () => {
  window.location.href = '/k/admin/app/' + APP_ID + '/plugin/';
};

//テーブル行追加
const addItem = (index) => {
  targetApp.value.splice(index + 1, 0, { id: Date.now(), appId: '', appName: '' });
};

//テーブル行削除
const removeItem = (index) => {
  targetApp.value.splice(index, 1);
  if (targetApp.value.length === 0) {
    targetApp.value.splice(index + 1, 0, { id: Date.now(), appId: '', appName: '' });
  }
};
</script>

<!-- <style scoped>：コンポーネント内の要素にのみスタイルを適用する -->
<style scoped>
/* 基本的なリセットとレイアウト */
.plugin-config-container {
  font-family: 'Inter', 'Noto Sans JP', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  padding: 30px;
  max-width: 1200px;
  margin: 30px auto;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  border: 1px solid #e0e7eb;
}

/* ヘッダー */
.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
  text-align: center;
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f0f4f7;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #34495e;
  border-left: 4px solid #4a90e2;
  padding-left: 10px;
}

.section-divider {
  border: 0;
  border-top: 1px solid #f0f4f7;
  margin: 30px 0;
}

/* 設定項目 */
.setting-section {
  margin-bottom: 30px;
}

.setting-item {
  margin-bottom: 20px;
}

.label-text {
  display: block;
  font-weight: 500;
  margin-bottom: 8px;
  color: #333;
  font-size: 15px;
}

.required-mark {
  color: #e74c3c;
  font-weight: bold;
  margin-left: 4px;
}

/* フォーム要素 */
.plugin-config-container .text-input,
.plugin-config-container select,
.plugin-config-container input[type='date'] {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d9e0;
  border-radius: 8px;
  font-size: 15px;
  color: #333;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.plugin-config-container .text-input,
.plugin-config-container input[type='date'] {
  background-color: #fcfdfe;
}

.plugin-config-container .text-input:focus,
.plugin-config-container select:focus,
.plugin-config-container input[type='date']:focus {
  border-color: #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.2);
  outline: none;
  background-color: #ffffff;
}

.plugin-config-container input[readonly] {
  background-color: #f5f5f5;
  cursor: default;
}

.plugin-config-container input[readonly]:focus {
  background-color: #f5f5f5;
  border-color: #d1d9e0;
  box-shadow: none;
}

.plugin-config-container select {
  appearance: none;
  background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M7%2010l5%205%205-5z%22%2F%3E%3C%2Fsvg%3E');
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 18px;
  cursor: pointer;
}

/* エラー表示 */
.input-error {
  border-color: #e74c3c !important;
  box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.2) !important;
}

.error-message {
  color: #e74c3c;
  font-size: 13px;
  margin-top: 6px;
  font-weight: 500;
  white-space: pre-line;
}

/* データテーブル */
.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
  border: 1px solid #e0e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.data-table th,
.data-table td {
  padding: 12px 15px;
  border: 1px solid #f0f4f7;
  text-align: left;
  vertical-align: middle;
}

.data-table th {
  background-color: #f7f9fb;
  font-weight: 600;
  color: #555;
  font-size: 14px;
}

/* 列幅 */
.field-header {
  width: 50%;
}
.table-header-action {
  width: 90px;
  text-align: center;
}

/* ボタン */
.table-actions {
  white-space: nowrap;
  text-align: center;
}

.action-icon-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin: 0 5px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.add-button {
  background-color: #e6f7ff;
  background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22%234a90e2%22%20d%3D%22M19%2013h-6v6h-2v-6H5v-2h6V5h2v6h6v2z%22%2F%3E%3C%2Fsvg%3E');
  background-repeat: no-repeat;
  background-position: center;
  background-size: 16px;
}

.remove-button {
  background-color: #ffebeb;
  background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22%23e74c3c%22%20d%3D%22M19%2013H5v-2h14v2z%22%2F%3E%3C%2Fsvg%3E');
  background-repeat: no-repeat;
  background-position: center;
  background-size: 16px;
}

.action-icon-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.add-button:hover {
  background-color: #d1efff;
}

.remove-button:hover {
  background-color: #ffd1d1;
}

.button-group {
  text-align: center;
  margin-top: 40px;
  padding-top: 30px;
  border-top: 1px solid #f0f4f7;
}

.action-button {
  padding: 12px 30px;
  margin: 0 10px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 140px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.primary-button {
  background-color: #4a90e2;
  color: white;
}

.primary-button:hover {
  background-color: #357bd8;
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.12);
}

.secondary-button {
  background-color: #eceff1;
  color: #555;
  border: 1px solid #cfd8dc;
}

.secondary-button:hover {
  background-color: #e0e4e6;
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.05);
}

/* カスタムモーダル :global…VueのScoped CSS内でそのクラスをグローバルなスタイルとして適用できる */
:global(.custom-modal-overlay) {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

:global(.custom-modal) {
  background-color: #fff;
  padding: 40px 60px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  text-align: center;
  max-width: 400px;
  width: 90%;
  position: relative;
  border: 1px solid #e0e7eb;
}

:global(.custom-modal p) {
  font-size: 16px;
  color: #333;
  margin-bottom: 20px;
}
</style>
