import videojs from 'video.js'

const Button = videojs.getComponent('Button')

class LiveMenuButton extends Button {
    player_: any
    player: any
    controlText_: string | undefined
    options_: any
    list: any
    constructor (player: any, options: any) {
      super(player, options)
      this.list = options.list || []
      this.player = player
    }

    createEl () {
      return super.createEl('button', {
        innerHTML: '直播'
      })
    }

    createItems () {

    }

    buildCSSClass () {
      return Button.prototype.buildCSSClass.call(this) + ' vjs-live-icon'
    }
}

LiveMenuButton.prototype.controlText_ = '直播'

videojs.registerComponent('LiveMenuButton', LiveMenuButton)

declare global {
    interface Window {
        myPlayer: any;
    }
}

const videoJsLive = function (this: any, options: any) {
  let player = this

  player.ready(function () {
    const menuButton = new LiveMenuButton(player, {})
    const ele = menuButton.createEl()
    ele.addEventListener('click', function () {
      player.trigger('liveBtnClick')
    })
    player.controlBar.videoJsLive = player.controlBar.el_.insertBefore(ele, player.controlBar.getChild('fullscreenToggle').el_)
    player.controlBar.videoJsLive.dispose = function () {
      this.parentNode.removeChild(this)
    }
  })
}

// register the plugin
videojs.plugin('videoJsLive', videoJsLive)
