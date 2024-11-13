// =============================================================================
// AB_Map.js
// Version: 0.02
// -----------------------------------------------------------------------------
// Copyright (c) 2015 ヱビ
// Released under the MIT license
// http://opensource.org/licenses/mit-license.php
// -----------------------------------------------------------------------------
// [Homepage]: ヱビのノート
//             http://www.zf.em-net.ne.jp/~ebi-games/
// =============================================================================


/*:
 * @plugindesc v1.00 マップを行き来しやくするプラグイン
 * 
 * @author ヱビ
 *
 * 
 * 
 * @help
 * ============================================================================
 * どんなプラグイン？
 * ============================================================================
 * 
 * 1画面に収まるマップを並べるタイプのゲームが作りやすくなるプラグインです。
 * 
 * ============================================================================
 * 機能
 * ============================================================================
 * 
 * 〇自動的に移動
 * ×マップを表示
 * 
 * ============================================================================
 * フォーマット
 * ============================================================================
 * 
 * マップ名と階層を下記のフォーマットにする必要があります。
 * 
 * エリアID-マップ名
 *     1-1
 *     1-2
 *     1-3
 *     ...
 *     2-1
 *     ...
 * 
 * エリアID……そのエリア（はじまりの森、など）を意味するID
 * 1-1　　 ……X-Yです。
 * 
 * 注意！
 * 隣のエリアと境目が2マス移動できるスペースを作ってください。
 * 
 * 　　　　　→隣のエリア
 * ○　■□□
 * ×　■■□　……隣のエリアから移動してきたとき引っかかり、動けなくなる
 * 
 * 隣のマップと高さと幅を同じにしてください。
 * 
 * ============================================================================
 * 更新履歴
 * ============================================================================
 * 
 * Version 1.00
 *   公開用にリファクタリング
 * 
 * Version 0.02
 *   設定されていないマップに場所移動したときエラーが出ることがあるのを修正
 * 
 * Version 0.01
 *   作成
 * 
 * ============================================================================
 * 利用規約
 * ============================================================================
 * 
 * ・MITライセンスです。
 * ・クレジット表記は不要
 * ・営利目的で使用可
 * ・ソースコードのライセンス表示以外は改変可
 * ・素材だけの再配布も可
 * ・アダルトゲーム、残酷なゲームでの使用も可
 * 
 * 
 */

	var ABMapIdRef = [];
(function() {
	var parameters = PluginManager.parameters('ABMZ_Map');
	var displayHateLine = (parameters['DisplayHateLine'] == 1) ? true : false;
	var HateDebugMode = (parameters['DebugMode'] == 1) ? true : false;
	var DamageHateFormula = (parameters['DamageHateFormula'] || 0);
//=============================================================================
// DataManager
//=============================================================================

	// DataManagerで$dataMapInfosのJSONファイルを読み込む際にprocessABMap1を呼ぶ
	var _DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
	DataManager.isDatabaseLoaded = function() {
		if (!_DataManager_isDatabaseLoaded.call(this)) return false;
		this.processABMap1($dataMapInfos);
		return true;
	};

	// データベースをロードする際、
	// $dataMapInfosのJSONファイルを読み込む際にprocess
	DataManager.processABMap1 = function(group) {
		console.log("processABMap1")// OK
		var noteABMapBlockXY = /(\d+)-(\d+)/;

		for (var n=1; n<group.length; n++) {
			var obj = group[n];
			if (!obj) continue;
			if (obj.name.match(noteABMapBlockXY)) {
				var x = Number(RegExp.$1);
				var y = Number(RegExp.$2);
				var areaId = this.getAreaId(obj.parentId);
				console.log("y" + y + "x" + x);//OK
				if (areaId) {
					obj.areaId = areaId;
					obj.areaX = x;
					obj.areaY = y;
					if (!ABMapIdRef[areaId]) ABMapIdRef[areaId] = {};
					if (!ABMapIdRef[areaId][x]) ABMapIdRef[areaId][x] = {};
					ABMapIdRef[areaId][x][y] = obj.id;
					console.log("areaId" + areaId + "y" + y + "x" + x) //OK;
					console.log(ABMapIdRef[areaId][x][y]);
				}
			}
		}
	};

	// areaIDは、親のマップのメモに記述したID
	DataManager.getAreaId = function(parentId) {
		var noteABMapAreaId = /^(\d+)-/;
		if(!$dataMapInfos[parentId]) return;
		if ($dataMapInfos[parentId].name.match(noteABMapAreaId)) {
			return Number(RegExp.$1);
		}
		return 0;
	}

//=============================================================================
// Game_System
//=============================================================================


	Game_System.prototype.clearABMap = function() {
		ABMapIdRefIdRef = {};
	};

	Game_System.prototype.setABMapSpot = function(areaId, x, y, mapId) {
		if (!this.isABMapExist(areaId, x, y)) return;
		if (!ABMapIdRef) this.clearABMap();
		if (!ABMapIdRef[areaId]) ABMapIdRefIdRef[areaId] = {};
		if (!ABMapIdRef[areaId][x]) ABMapIdRefIdRef[areaId][x] = {};
		ABMapIdRef[areaId][x][y] = mapId;
	};

	Game_System.prototype.getABMap = function(areaId, x, y) {
		if (!this.isABMapExist(areaId, x, y)) return -1;
		if (!ABMapIdRef || !ABMapIdRef[areaId] || !ABMapIdRef[areaId][x]) {
			this.setABMapSpot(areaId, x, y, 0);
		}
		return ABMapIdRef[areaId][x][y];
	};

	Game_System.prototype.isABMapExist = function(areaId, x, y) {
		if (!ABMapIdRef[areaId]) return false;
		if (!ABMapIdRef[areaId][x]) return false;
		if (!ABMapIdRef[areaId][x][y]) return false;
		return true;
	};

//=============================================================================
// Game_Map
//=============================================================================

	var _Game_Map_prototype_setup = Game_Map.prototype.setup;
	Game_Map.prototype.setup = function(mapId) {
		_Game_Map_prototype_setup.call(this, mapId);
		if (!$dataMapInfos[mapId]) return;
		this.areaId = $dataMapInfos[mapId].areaId;
		this.areaX = $dataMapInfos[mapId].areaX;
		this.areaY = $dataMapInfos[mapId].areaY;
		$gameSystem.setABMapSpot(this.areaId, this.areaX, this.areaY, mapId);
	};

	Game_Map.prototype.isNextABMapExist = function(dx, dy) {
		console.log("isNextABMapExist");
		if (!this.areaId) return false;
		var x = this.areaX + dx;
		var y = this.areaY + dy;
		return $gameSystem.isABMapExist(this.areaId, x, y);
	};

//=============================================================================
// Game_Player
//=============================================================================


	var _Game_Player_prototype_moveStraight = Game_Player.prototype.moveStraight;
	Game_Player.prototype.moveStraight = function(wasMoving) {
		this.moveToNextABMap(wasMoving);
		_Game_Player_prototype_moveStraight.call(this, wasMoving);
		console.log("moveStraight");// OK
	};

	Game_Player.prototype.moveToNextABMap = function(wasMoving) {
		if (!wasMoving || !$gameMap.areaId || $gameMap.setupStartingEvent()) {
			return;
		}
		console.log("movetonextABMap") // OK
		// 左側へ
		if (this.x < 1 
			&& $gameMap.isNextABMapExist(0, -1)) {
			var mapId = ABMapIdRef[$gameMap.areaId][$gameMap.areaX][$gameMap.areaY-1];
			var x = $dataMap.width - 2;
			var y = this.y;
			this.reserveTransfer(mapId, x, y, null, 0);
		
		// 右側へ
		} else if (this.x > $gameMap.width() - 2 
			&& $gameMap.isNextABMapExist(0, 1)) {
			var mapId = ABMapIdRef[$gameMap.areaId][$gameMap.areaX][$gameMap.areaY+1];
			var x = 1;
			var y = this.y;
			this.reserveTransfer(mapId, x, y, null, 0);
		//上へ
		} else if (this.y < 1 
			&& $gameMap.isNextABMapExist(-1, 0)) {
			var mapId = ABMapIdRef[$gameMap.areaId][$gameMap.areaX-1][$gameMap.areaY];
			var x = this.x;
			var y = $dataMap.height - 2;
			this.reserveTransfer(mapId, x, y, null, 0);
		// 下へ
		} else if (this.y > ($gameMap.height() - 2)
			 && $gameMap.isNextABMapExist(1, 0)) {
			var mapId = ABMapIdRef[$gameMap.areaId][$gameMap.areaX+1][$gameMap.areaY];
			var x = this.x;
			var y = 1;
			this.reserveTransfer(mapId, x, y, null, 0);
		}
	};

	
//=============================================================================
// MiniMap
//=============================================================================

/*
	MiniMap = function() {
		this.initialize.apply(this, arguments);
	};
	MiniMap.prototype = Object.create(Sprite.prototype);
	MiniMap.prototype.constructer = MiniMap;

	MiniMap.prototype.initialize = function() {
		Sprite.prototype.initialize.call(this);
		var w = this.visibleWidth();
		var h = this.visibleHeight();
		this.bitmap = new Bitmap(w, h);
		this.areaId = undefined;
		this.areaY = undefined;
		this.areaY = undefined;
		this.opacity = 128;
	};

	MiniMap.prototype.setArea = function(areaId, areaX, areaY) {
		this.areaId = areaId;
		this.areaX = areaX;
		this.areaY = areaY;
		this.refresh();
	};

	MiniMap.prototype.refresh = function() {
		if (!this.areaId) return;
		var w = this.visibleWidth();
		var h = this.visibleHeight();
		var bitmap = new Bitmap(w, h);
		this.bitmap = bitmap;

		var tw = this.tileWidth();
		var th = this.tileHeight();

		// bitmap.fillRect(x, y, w, h, color(CSSFormat));
	
		for (var y=this.areaY, yl=this.visibleDataHeight(); y < yl; y++) {
			for (var x=this.areaY, xl=this.visibleDataWidth(); x < xl; x++) {
				if ($gameSystem.isABMapExist(this.areaId, x, y) 
					 && $gameSystem.getABMap(this.areaId, x, y)) {
					var sx = x - this.areaY;
					var sy = y - this.areaY;
					bitmap.fillRect(sx * tw, sy * th, tw, th, "#9999ff");
					for (var dy = -1; dy <= 1; dy++) {
						for (var dx = -1; dx <= 1; dx++) {
							if (!$gameSystem.isABMapExist(this.areaId, x+dx, y+dy)) {
								var x2 = sx + tw + (dx == 1) ? tw - 2 : 0;
								var y2 = sy + th + (dy == 1) ? th - 2 : 0;
								var w2 = (dx == 0) ? tw : 2;
								var h2 = (dy == 0) ? th : 2;
								bitmap.fillRect(x2, y2, w2, h2, "#ffffff");
							}
						}
					}
				}
			}
		}
		for (var y = 0, yl = this.visibleDataHeight(); y < yl; y++) {
			for (var x = 0, xl = this.visibleDataWidth(); x < xl; x++) {
				var ax = this.areaY + x - Math.floor(xl / 2);
				var ay = this.areaY + y - Math.floor(yl / 2);
				if ($gameSystem.isABMapExist(this.areaId, ax, ay) 
					 && $gameSystem.getABMap(this.areaId, ax, ay)) {
					bitmap.fillRect(x * tw, y * th, tw, th, "#9999ff");
					if (this.areaY == ax && this.areaY == ay) {
						bitmap.fillRect((x + 3/8) * tw, (y + 3/8) * th , tw / 4, th / 4, "#ffff99");
					}
					for (var dy = -1; dy <= 1; dy++) {
						for (var dx = -1; dx <= 1; dx++) {
							if (!$gameSystem.isABMapExist(this.areaId, ax+dx, ay+dy)) {
								var x2 = x * tw + ((dx == 1) ? tw - 2 : 0);
								var y2 = y * th + ((dy == 1) ? th - 2 : 0);
								var w2 = (dx == 0) ? tw : 2;
								var h2 = (dy == 0) ? th : 2;
								bitmap.fillRect(x2, y2, w2, h2, "#ffffff");
							}
						}
					}
				}
			}
		}
	};

	MiniMap.prototype.tileWidth = function() {
		return 32;
	};

	MiniMap.prototype.tileHeight = function() {
		return 32;
	};

	MiniMap.prototype.visibleDataWidth = function() {
		return 9;
	};

	MiniMap.prototype.visibleDataHeight = function() {
		return 9;
	};

	MiniMap.prototype.visibleWidth = function() {
		return this.tileWidth() * this.visibleDataWidth();
	};
	MiniMap.prototype.visibleHeight = function() {
		return this.tileHeight() * this.visibleDataHeight();
	};

//=============================================================================
// Spriteset_Map
//=============================================================================

	var _Spriteset_Map_prototype_createLowerLayer
			 = Spriteset_Map.prototype.createLowerLayer;
	Spriteset_Map.prototype.createLowerLayer = function() {
		_Spriteset_Map_prototype_createLowerLayer.call(this);
		this.createMiniMap();
	};

	Spriteset_Map.prototype.createMiniMap = function() {
		this._miniMap = new MiniMap();
		if ($gameMap.areaId) {
			this._miniMap.setArea($gameMap.areaId, $gameMap.areaY, $gameMap.areaY);
			this.addChild(this._miniMap);
		}
	};
*/
})();
