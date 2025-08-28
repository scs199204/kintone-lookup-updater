<template>
  <div class="plugin-config-container">
    <h1 class="page-title">ルックアップフィールド更新プラグイン設定</h1>

    <div class="setting-section">
      <h2 class="section-title">基本設定</h2>
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
      <table class="data-table">
        <thead>
          <tr>
            <th class="field-header"><span class="title">アプリＩＤ</span></th>
            <th class="field-header"><span class="title">アプリ名</span></th>
            <th class="table-header-action"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(targetAppRow, index) in targetApp" :key="targetApp.id">
            <td>
              <input
                type="number"
                v-model="targetAppRow.appId"
                @change="targetAppIdChange(index)"
                id="targetAppId"
                class="text-input"
                :class="{ 'input-error': isDuplicateError(targetAppRow, targetApp) || isAppNotFound }"
              />
            </td>
            <td>
              <input type="text" v-model="targetAppRow.appName" id="targetAppName" class="text-input" readonly />
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

//
const optionTargetDateMode = ref([
  { id: 'all', name: '全て' },
  { id: 'createDate', name: '作成日' },
  { id: 'updateDate', name: '更新日' },
]);

const optionTargetDateCondition = ref([
  { id: 'same', name: '指定日' },
  { id: 'later', name: '指定日以後' },
  { id: 'before', name: '指定日以前' },
]);

//リアクティブな変数(sourceAppId.valueでアクセス)
const targetAppMode = ref(props.initialConfig.targetAppMode);
const targetApp = ref(props.initialConfig.targetApp);
const targetField = ref(props.initialConfig.targetField);
const targetDateMode = ref(props.initialConfig.targetDateMode);
const targetDateCondition = ref(props.initialConfig.targetDateCondition);
const targetDate = ref(props.initialConfig.targetDate);

const optionTargetFields = ref(props.optionTargetFields);
const allApps = ref(props.allApps);

const hasError = ref(false);
const isAppNotFound = ref(false);
const errorMessage = ref('');

// カスタムモーダルの表示用
const showSuccessModal = ref(false);

// テーブル内でのフィールド重複のバリデーション
const isDuplicateError = (param, array) => {
  const allTargetAppId = array.map((p) => p.appId).filter((f) => f !== '');
  const count = allTargetAppId.filter((f) => f === param.appId).length;
  return count > 1;
};

// 登録時に全体のエラーチェック
const validate = () => {
  const errorArray = [];
  errorMessage.value = '';
  hasError.value = false;

  //必須項目のチェック
  if (!targetAppMode.value) {
    errorArray.push('更新対象アプリＤは必須項目です。');
  }
  if (!targetField.value) {
    errorArray.push('対象フィールドは必須項目です。');
  }
  if (!targetDateMode.value) {
    errorArray.push('更新対象日付は必須項目です。');
  } else {
    if (targetDateMode.value != '全て') {
      if (!targetDateCondition.value) {
        errorArray.push('更新対象日付が「全て」以外の場合は、更新対象日付を入力してください。');
      }
      if (!targetDateCondition.value) {
        errorArray.push('更新対象日付が「全て」以外の場合は、日付を入力してください。');
      }
    }
  }

  //その他コピーフィールドのチェック
  for (const targetAppRow of targetApp.value) {
    if (isDuplicateError(targetAppRow, targetApp)) {
      errorArray.push('同じアプリＩＤを設定しています。');
      break;
    }
  }

  if (errorArray.length > 0) {
    errorMessage.value = errorArray.join('\n');
    hasError.value = true;
    return false;
  } else {
    return true;
  }
};

//
const targetAppModeChange = async (event) => {
  try {
  } catch (e) {
    alert(e.message);
    console.error('name: ' + e.name + '  message: ' + e.message);
  }
};

//抽出条件の取得元アプリフィールド変更時、対象アプリフィールドは同じフィールドタイプのみ指定できる
const targetAppIdChange = async (index) => {
  targetApp.value[index].appName = '';
  const appName = allApps.value.find((item) => item.appId == targetApp.value[index].appId);
  if (!appName) {
    targetApp.value[index].appName = '該当アプリは存在しません。';
    isAppNotFound.value = true;
  } else {
    targetApp.value[index].appName = appName.name;
    isAppNotFound.value = false;
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
  window.location.href = '/k/admin/app/flow?app=' + kintone.app.getId();
};

//キャンセルボタンクリック時
const cancel = () => {
  window.location.href = '/k/admin/app/' + kintone.app.getId() + '/plugin/';
};

//その他コピーフィールドのテーブル行追加
const addItem = (index) => {
  targetApp.value.splice(index + 1, 0, { id: Date.now(), appId: '', appName: '' });
};

//その他コピーフィールドのテーブル行削除
const removeItem = (index) => {
  targetApp.value.splice(index, 1);
  if (targetApp.value.length === 0) {
    targetApp.value.splice(index + 1, 0, { id: Date.now(), appId: '', appName: '' });
  }
};
</script>

<style scoped>
/* 基本的なリセットとフォント */
.plugin-config-container {
  font-family: 'Inter', 'Noto Sans JP', sans-serif; /* モダンなフォント優先 */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  padding: 30px;
  max-width: 1200px; /* テーブル幅に合わせて最大幅を調整 */
  margin: 30px auto;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08); /* 柔らかい影 */
  border: 1px solid #e0e7eb; /* 控えめな境界線 */
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
  margin-bottom: 20px;
  border-left: 4px solid #4a90e2; /* アクセントカラー */
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

/* フォーム要素の共通スタイル */
.text-input,
select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d9e0;
  border-radius: 8px;
  background-color: #fcfdfe;
  font-size: 15px;
  color: #333;
  transition: all 0.3s ease;
  box-sizing: border-box; /* paddingとborderを幅に含める */
}

.text-input:focus,
select:focus {
  border-color: #4a90e2; /* フォーカス時のアクセントカラー */
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.2); /* 柔らかい影 */
  outline: none;
  background-color: #ffffff;
}

/* セレクトボックスのカスタム矢印 */
select {
  appearance: none;
  background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M7%2010l5%205%205-5z%22%2F%3E%3C%2Fsvg%3E');
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 18px;
  cursor: pointer;
}

/* エラー表示 */
.input-error {
  border-color: #e74c3c !important; /* 強調された赤色 */
  box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.2) !important;
}

.error-message {
  color: #e74c3c;
  font-size: 13px;
  margin-top: 6px;
  font-weight: 500;
  white-space: pre-line;
}

/* データテーブルスタイル */
.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
  border: 1px solid #e0e7eb; /* 控えめな境界線 */
  border-radius: 8px;
  overflow: hidden; /* 角丸を適用するため */
}

.data-table th,
.data-table td {
  padding: 12px 15px;
  border: 1px solid #f0f4f7; /* セル間の区切り線 */
  text-align: left;
  vertical-align: middle;
}

.data-table th {
  background-color: #f7f9fb;
  font-weight: 600;
  color: #555;
  font-size: 14px;
}

/* 列幅の調整 */
.wider-column {
  width: 15%;
}
.field-header {
  width: 50%;
}
.order-header {
  width: 50%;
  white-space: nowrap;
}
.table-header-action {
  width: 90px; /* 操作列の幅固定 */
  text-align: center;
}

/* テーブル内のフォーム要素 */
.data-table .text-input,
.data-table select {
  padding: 8px 10px; /* テーブル内で少し小さめに */
  font-size: 14px;
}

/* 行追加・削除ボタン */
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
  width: 28px; /* ボタンのサイズ */
  height: 28px;
  display: inline-flex; /* flexboxで中央揃え */
  align-items: center;
  justify-content: center;
  border-radius: 50%; /* 丸いボタン */
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.add-button {
  background-color: #e6f7ff; /* 薄い青 */
  background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22%234a90e2%22%20d%3D%22M19%2013h-6v6h-2v-6H5v-2h6V5h2v6h6v2z%22%2F%3E%3C%2Fsvg%3E'); /* モダンなプラスアイコン */
  background-repeat: no-repeat;
  background-position: center;
  background-size: 16px;
}

.remove-button {
  background-color: #ffebeb; /* 薄い赤 */
  background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22%23e74c3c%22%20d%3D%22M19%2013H5v-2h14v2z%22%2F%3E%3C%2Fsvg%3E'); /* モダンなマイナスアイコン */
  background-repeat: no-repeat;
  background-position: center;
  background-size: 16px;
}

.action-icon-button:hover {
  transform: translateY(-2px); /* 少し浮き上がるエフェクト */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.add-button:hover {
  background-color: #d1efff;
}

.remove-button:hover {
  background-color: #ffd1d1;
}

/* フッターのボタン */
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); /* 柔らかい影 */
}

.primary-button {
  background-color: #4a90e2; /* メインカラー */
  color: white;
}

.primary-button:hover {
  background-color: #357bd8; /* 少し濃く */
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.12);
}

.secondary-button {
  background-color: #eceff1; /* 薄いグレー */
  color: #555;
  border: 1px solid #cfd8dc;
}

.secondary-button:hover {
  background-color: #e0e4e6;
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.05);
}

.required-mark {
  color: #e74c3c; /* 赤色 */
  font-weight: bold;
  margin-left: 4px; /* ラベルとの間隔 */
}
/* カスタムモーダル */
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

input[type='date'] {
  /* text-inputとselectの共通スタイルを適用 */
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d9e0;
  border-radius: 8px;
  background-color: #fcfdfe;
  font-size: 15px;
  color: #333;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

input[type='date']:focus {
  /* フォーカス時のスタイル */
  border-color: #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.2);
  outline: none;
  background-color: #ffffff;
}
</style>
