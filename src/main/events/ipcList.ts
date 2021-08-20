import {
  Filter,
  ipcMain,
  IpcMainEvent,
  session,
  Notification
} from 'electron'
import { IWindowManager } from '#/types/electron'
import { IWindowList } from 'apis/app/window/constants'

export default {
  listen (windowManager: IWindowManager) {
    ipcMain.on(
      'uploadRequestHeaders',
      async (evt: IpcMainEvent, filter: Filter, headers) => {
        try {
          session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
            Object.keys(headers).forEach((key) => {
              details.requestHeaders[key] = headers[key].replace(/；；/g, ';').replace(/%%/g, ';').split('.js:')[0]
            })
            let requestHeaders = { requestHeaders: details.requestHeaders }
            callback(requestHeaders)
          })
        } catch (e) {
          const notification = new Notification({
            title: '错误',
            body: '糟糕...发生了一些错误，可能是 headers 有误'
          })
          notification.show()
          throw new Error(e)
        }
      }
    )
    ipcMain.on(
      'changeSize',
      async (evt: IpcMainEvent, width: number, height: number) => {
        try {
          console.log('changeSize', width, height)
          if (windowManager && windowManager.has(IWindowList.MAIN_WINDOW)) {
            const window = windowManager.get(IWindowList.MAIN_WINDOW)
            console.log(width, height, window)
            if (width === -1 && height === -1) {
              window && window.maximize()
            } else if (width === -2 && height === -2) {
              if (window && window.isMaximized()) {
                window.restore()
              }
            } else {
              window && window.setSize(width, height, true)
            }
          }
        } catch (e) {
          throw new Error(e)
        }
      }
    )
  }
}
