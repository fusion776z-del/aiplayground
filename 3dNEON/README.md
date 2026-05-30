# Mobile 3D Shooter Starter

スマホ操作対応の3Dシューティングゲーム雛形です。

## ファイル構成

- `index.html`: タイトル画面、ステージ選択、HUD、スマホUI
- `style.css`: 画面レイアウト、タッチUI
- `js/core.js`: Three.js初期化、プレイヤー、弾、敵、当たり判定、ステージ切替
- `js/audio.js`: BGM/SFX拡張用
- `js/game1.js`〜`js/game5.js`: 各ステージの敵出現・難易度・クリア条件
- `assets/music/`: BGM配置用
- `assets/sfx/`: 効果音配置用

## 音楽を追加する方法

`assets/music/stage1.mp3` などを置いて、`js/audio.js` の `tracks` を次のように変更します。

```js
const tracks = {
  title: 'assets/music/title.mp3',
  stage1: 'assets/music/stage1.mp3',
  stage2: 'assets/music/stage2.mp3',
  stage3: 'assets/music/stage3.mp3',
  stage4: 'assets/music/stage4.mp3',
  stage5: 'assets/music/stage5.mp3',
  clear: 'assets/music/clear.mp3'
};
```

効果音は `sfx` に追加してください。

## 起動

`index.html` をブラウザで開きます。CDNのThree.jsを使っているので、初回はネット接続が必要です。
ローカルだけで動かしたい場合は Three.js をダウンロードし、`index.html` の script URL を差し替えてください。
