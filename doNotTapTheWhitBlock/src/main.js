var Game = (function () {
  var _DEFAULT_CONFIG = {
    row: 5,
    level: 1
  }

  function isPC() {
    var userAgentInfo = navigator.userAgent;
    var Agents = ["Android", "iPhone",
      "SymbianOS", "Windows Phone",
      "iPad", "iPod"];
    var flag = true;
    for (var v = 0; v < Agents.length; v++) {
      if (userAgentInfo.indexOf(Agents[v]) > 0) {
        flag = false;
        break;
      }
    }
    return flag
  }

  function combineConfig(config) {
    var _config = {
      row: config.row || _DEFAULT_CONFIG.row,
      level: config.level || _DEFAULT_CONFIG.level
    }

    if (typeof _config.row !== 'number') {
      throw new Error('config.row must be a number')
    } else if (_config.row < 2 || _config.row > 8) {
      throw new Error('config.row must between 2~8')
    }

    if (typeof _config.level !== 'number') {
      throw new Error('config.level must be a number')
    } else if (_config.level < 1 || _config.level > 3) {
      throw new Error('config.level must between 1~3')
    }

    return _config
  }
  
  function getFirstRow(rows) {
    var index = 0
    while (rows[index]._readyToDrop) {
      index++
    }

    return rows[index]
  }

  function handleHit(e, self) {
    if (self._rows.length === 0 || self._error) {
      return
    }
    var firstRow = getFirstRow(self._rows)
    if (firstRow) {
      var range = firstRow.getRange()

      if (
        e.offsetX >= range.left &&
        e.offsetX <= range.right &&
        e.offsetY >= range.top &&
        e.offsetY <= range.bottom
      ) {
        self.onhit && self.onhit()
        firstRow._readyToDrop = true
      }
    }
  }

  function getCanvas(canvasId) {
    var canvas = document.getElementById(canvasId)
    if (canvas === null || canvas.tagName !== 'CANVAS') {
      throw new Error('can not find targetCanvas or targetCanvas is not a canvas')
    }
    return canvas
  }

  function randomRowPosition(row) {
    return Math.floor(Math.random() * row)
  }

  function addRow(self, initOffset) {
    self._rows.push(new ROW(
      self._ctx,
      self._rowWith,
      self._rowHeight,
      self._config.row,
      self._config.level,
      initOffset
    ))
  }

  function moveRows(rows) {
    for(var i =0; i < rows.length; i++) {
      rows[i].move()
    }
  }

  function handlePlay(self) {
    var firstRow = self._rows[0]
    if (self._tickCount >= self._rowHeight) {
      var offsetHeight = self._tickCount - self._rowHeight
      addRow(self, offsetHeight)
      self._tickCount = offsetHeight
    }

    // 判断第一个黑格是否触底
    if (firstRow && firstRow._currentBottomOffset >= self._stageHeight) {
      self._error = true
      self.stop()
      if (self.onfailed) {
        self.onfailed()
      } else {
        alert('游戏失败！！')
      }
      return
    }
    self._ctx.clearRect(0, 0, self._stageWidth, self._stageHeight)
    self._tickCount = self._tickCount + self._config.level
    moveRows(self._rows)

    updateRow(self)
  }

  function updateRow(self) {
    var nextRows = []
    for (var i = 0; i < self._rows.length; i++) {
      var row = self._rows[i]
      if (!row._readyToDrop) {
        nextRows.push(row)
      }
    }
    self._rows = nextRows
  }

  function addListener(elem, event, callback) {
    if (elem.addEventListener) {
      elem.addEventListener(event, callback)
    } else if (elem.attachEvent) {
      elem.attachEvent('on' + event, callback)
    } else {
      elem['on' + event] = callback
    }
  }

  function removeListener(elem, event, callback) {
    if (elem.addEventListener) {
      elem.addEventListener(event, callback)
    } else if (elem.attachEvent) {
      elem.attachEvent('on' + event, callback)
    } else {
      elem['on' + event] = callback
    }
  }

  function bindEvent(canvas, self) {
    if (self.isPc) {
      addListener(canvas, 'click', function (ev) {
        handleHit(ev, self)
      })
    } else {
      addListener(canvas, 'touchstart', function (ev) {
        ev.preventDefault()
        var touchEvent = ev.touches[0]
        ev.offsetX = touchEvent.pageX - touchEvent.target.offsetLeft
        ev.offsetY = touchEvent.pageY - touchEvent.target.offsetTop
        handleHit(ev, self)
      })
    }
  }


  // 声明Game类，对游戏流程进行控制
  function Game(targetCanvas, config) {
    // 由于仅暴露init方法给外部来初始化游戏实例，所以不需考虑调用方式
    // if (!(this instanceof Game)) {
    //   throw new Error('must be invoked using the new operator')
    // }

    this.isPc = isPC()
    this._config = combineConfig(config)

    var canvas = getCanvas(targetCanvas)
    this._ctx = canvas.getContext('2d')
    this._ctx.fillStyle = "rgb(0,0,0)"
    this._stageWidth = canvas.width
    this._stageHeight = canvas.height
    this._rowWith = this._stageWidth / this._config.row
    this._rowHeight = Math.floor(this._rowWith * 2)

    this._tickCount = 0
    this._error = false
    bindEvent(canvas, this)


    this._rows = []
    this._timer = null

    this.onfailed = null
    this.onhit = null
  }

  Game.prototype.start = function () {
    this._rows.length === 0 && addRow(this)

    var self = this
    this._timer = setInterval(function () {
      handlePlay(self)
    }, 0)
  }

  Game.prototype.stop = function () {
    this._timer && window.clearInterval(this._timer)
    
  }

  Game.prototype.switchLevel = function (level) {
    for (var i = 0; i< this._rows.length; i++) {
      this._rows[i].step = level
    }
    this._config.level = level
  }

  Game.prototype.restart = function () {
    this._ctx.clearRect(0, 0, this._stageWidth, this._stageHeight)
    this._rows = []
    this._tickCount = 0
    this._error = false
    this._config.level = 1
    this._timer && window.clearInterval(this._timer)

    this.start()
  }

  function ROW(ctx, width, height, row, step, initOffset) {
    this.step = step
    this.width = width
    this.height = height
    this.offsetX = randomRowPosition(row) * this.width

    this._currentBottomOffset = initOffset || 0
    this.__readyToDrop = false

    this._ctx = ctx
  }
  
  ROW.prototype.move = function () {
    this._currentBottomOffset = this._currentBottomOffset + this.step
    if (this._currentBottomOffset <= this.height) {
      this._ctx.fillRect(
        this.offsetX,
        0,
        this.width,
        this._currentBottomOffset
      )
    } else {
      this._ctx.fillRect(
        this.offsetX,
        this._currentBottomOffset - this.height,
        this.width,
        this.height
      )
    }
  }

  ROW.prototype.getRange = function () {
    var top = null
    if (this._currentBottomOffset <= this.height) {
      top = 0
    } else {
      top = this._currentBottomOffset - this.height
    }
    return {
      top: top - 10,
      left: this.offsetX - 10,
      right: this.offsetX + this.width + 10,
      bottom: this._currentBottomOffset + 10
    }
  }

  function init(targetCanvas, config) {
    if (!config) {
      config = {}
    }
    var game = new Game(targetCanvas, config)
    game.start()

    return game
  }

  return {
    init: init
  }
})()