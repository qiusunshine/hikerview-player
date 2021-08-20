import videojs from 'video.js'

const Button = videojs.getComponent('Button')

class ResolutionMenuButton extends Button {
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
        innerHTML: ''
      })
    }

    createItems () {

    }

    buildCSSClass () {
      return Button.prototype.buildCSSClass.call(this) + ' vjs-menu-icon vjs-resolution-button'
    }
}

ResolutionMenuButton.prototype.controlText_ = '列表'

videojs.registerComponent('ResolutionMenuButton', ResolutionMenuButton)

declare global {
    interface Window {
        myPlayer: any;
    }
}
const videoJsResolutionSwitcher = function (this: any, options: any) {
  let player = this

  player.ready(function () {
    console.log('player.ready')
    const menuButton = new ResolutionMenuButton(player, {})
    const ele = menuButton.createEl()
    ele.addEventListener('click', function () {
      console.log('handleClick')
      player.trigger('playlistBtnClick')
    })
    player.controlBar.resolutionSwitcher = player.controlBar.el_.insertBefore(ele, player.controlBar.getChild('fullscreenToggle').el_)
    player.controlBar.resolutionSwitcher.dispose = function () {
      this.parentNode.removeChild(this)
    }
  })
}

// register the plugin
videojs.plugin('videoJsPlaylist', videoJsResolutionSwitcher)
