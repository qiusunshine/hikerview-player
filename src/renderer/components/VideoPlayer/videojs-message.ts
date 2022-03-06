import videojs from 'video.js'

const ModalDialog = videojs.getComponent('ModalDialog')

class MessageModal extends ModalDialog {
  player_: any
  constructor (player: any, options: any) {
    super(player, options)
    this.open()
    setTimeout(() => {
      this.opened(false)
    }, 3000)
  }

  buildCSSClass () {
    return `vjs-resume-modal vjs-msg-modal ${super.buildCSSClass()}`
  }
}
videojs.registerComponent('MessageModal', MessageModal)

const Message = function (this: any, options: any) {
  let title = options
  // @ts-ignore
  this.addChild('MessageModal', {
    content: title
  })
}

videojs.plugin('Message', Message)
