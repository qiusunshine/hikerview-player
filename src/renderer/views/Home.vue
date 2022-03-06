<template>
  <div class="home">
    <el-row style="height: 100vh; width: 100vw">
      <el-col :span="6" :md="4" :xl="4" :lg="4" style="height: 100vh;">
        <el-menu
            ref="menu"
            :default-active="live.playing ? '2' : (movies.playing ? '3' : '1')"
            class="el-menu-vertical-demo"
            @select="handleOpen"
            background-color="#333333"
            text-color="#fff"
            active-text-color="#ACB3E7">
          <el-menu-item index="1">
            <i class="el-icon-video-play"></i>
            <span slot="title">网页投屏</span>
          </el-menu-item>
          <el-menu-item index="2">
            <i class="el-icon-monitor"></i>
            <span slot="title">电视直播</span>
          </el-menu-item>
          <el-menu-item index="3">
            <i class="el-icon-monitor"></i>
            <span slot="title">API测试</span>
          </el-menu-item>
        </el-menu>
      </el-col>
      <el-col :span="18" :md="20" :xl="20" :lg="20" style="height: 100vh;">
        <video-player @ready="videoReady" class="videoPlayer" style="height: 100%; width: 100%" :options="videoOptions"/>
        <el-dialog
            title="请输入您的手机 IP 地址"
            :visible.sync="visible"
            width="40%"
        >
          <div style="text-align: center">
            <div style="margin: 0 0 20px 0; font-size: 13px;">海阔视界的播放器页面点击网页投屏按钮即可看到IP地址，请确保手机和电脑在同一个局域网</div>
            <el-input
                ref="inAddressInput"
                v-model="ipAddress"
                placeholder="请输入 IP 地址"
                size="small"
                clearable
                autofocus
                @keyup.enter.native="confirm"
            >
              <span slot="append">:52020</span>
            </el-input>
          </div>
          <span slot="footer">
        <el-button size="mini" type="primary" @click="confirm">确认</el-button>
      </span>
          <span> </span>
        </el-dialog>
        <el-dialog
            :title="live.playing ? '线路切换' : '选集（按键盘上N键播放下一集）'"
            :visible.sync="chapter.visible"
            fullscreen
            customClass="dark-dialog"
        >
          <el-row :gutter="20" justify="space-around">
            <el-col :span="6" v-for="(item, index) in playList" :key="item + '_' + index" class="chapter-item">
              <el-button v-if="playTitle.length > 0 && playTitle.indexOf(item) >= 0" @click="playMe(item, index)" type="primary">{{item}}</el-button>
              <el-button v-else @click="playMe(item, index)" type="info">{{item}}</el-button>
            </el-col>
          </el-row>
        </el-dialog>
        <el-dialog
            title="直播源"
            :visible.sync="live.visible"
            fullscreen
            customClass="dark-dialog"
        >
          <el-row :gutter="20" justify="space-around" style="padding: 10px 5px 10px 5px;">
            <el-input
                v-model="liveAddress"
                placeholder="输入直播源地址后，按回车确认"
                size="small"
                clearable
                autofocus
                @keyup.enter.native="confirmLiveUrl"
            >
            </el-input>
          </el-row>
          <el-row :gutter="20" justify="space-around">
            <el-col :span="4" v-for="(item, index) in live.data" :key="item + '_' + index" class="chapter-item">
              <!--          <el-dropdown split-button type="info" @click="playLive(item.urls[0])">-->
              <!--            {{item.name}}-->
              <!--            <el-dropdown-menu slot="dropdown">-->
              <!--              <el-dropdown-item v-for="(u, ii) in item.urls" :key="u + '_' + ii" onclick="playLive(item.urls[ii])">{{"线路" + (ii + 1)}}</el-dropdown-item>-->
              <!--            </el-dropdown-menu>-->
              <!--          </el-dropdown>-->
              <el-button @click="playLive(item.urls[0], index)" type="info">{{item.name}}</el-button>
            </el-col>
          </el-row>
        </el-dialog>
        <el-dialog
            title="API测试"
            :visible.sync="movies.visible"
            fullscreen
            customClass="dark-dialog"
        >
          <movies :visible.sync="movies.visible" :playMovie="playMovie"/>
        </el-dialog>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import axios from 'axios'
import './home.css'
import VideoPlayer from '@/components/VideoPlayer/index'
import Movies from '@/views/Movies'
import { remote, ipcRenderer } from 'electron'
import { URL } from 'url'
import db from '../../universal/datastore'

export default {
  name: 'home',
  data () {
    return {
      jumpStartDuration: 0,
      jumpEndDuration: 0,
      visible: true,
      ipAddress: '',
      liveAddress: '',
      playUrl: '',
      playTitle: '',
      videoOptions: {
        language: 'zh-CN',
        autoplay: true,
        controls: true,
        playbackRates: [0.5, 1, 1.2, 1.5, 2, 3, 4],
        sources: [
          /** 默认不再播放视频 */
          // {
          //   src: 'http://vjs.zencdn.net/v/oceans.mp4',
          //   type: 'video/mp4'
          // }
        ],
        tracks: []
      },
      player: null,
      chapter: {
        visible: false
      },
      live: {
        visible: false,
        data: [],
        playing: false,
        index: 0
      },
      movies: {
        visible: false,
        chapters: [],
        playing: false,
        index: 0
      },
      playList: []
    }
  },
  components: {
    VideoPlayer,
    Movies
  },
  mounted () {
    let ipAddress = this.$db.get('ipAddress')
    let reg = new RegExp(
      /^((2[0-4]\d|25[0-5]|[01]?\d\d?)\.){3}(2[0-4]\d|25[0-5]|[01]?\d\d?)$/
    )
    if (reg.test(ipAddress)) {
      this.ipAddress = ipAddress
      this.checkUrl(false)
    }
    this.$nextTick(() => {
      this.$refs.inAddressInput.focus()
    })
    let liveAddress = this.$db.get('liveAddress')
    if (liveAddress) {
      this.liveAddress = liveAddress
      this.confirmLiveUrl(true)
    }
    let _this = this
    document.onkeydown = function (e) {
      let key = window.event.keyCode
      if (key === 78) {
        window.event.preventDefault()
        _this.playNext()
      }
    }
    setInterval(() => {
      if (!this.$refs.menu) {
        return
      }
      if (this.live.playing) {
        this.$refs.menu.updateActiveIndex(2)
      } else if (this.movies.playing) {
        this.$refs.menu.updateActiveIndex(3)
      } else {
        this.$refs.menu.updateActiveIndex(1)
      }
    }, 3000)
    // setTimeout(() => {
    //   try {
    //     ipcRenderer.send('startListen')
    //   } catch (e) {
    //     console.error(e)
    //   }
    // }, 3000)
  },
  methods: {
    handleOpen (index, indexPath) {
      if (index + '' === '1') {
        this.visible = true
      } else if (index + '' === '3') {
        this.movies = {
          ...this.movies,
          visible: true
        }
      } else {
        // this.$refs.menu.updateActiveIndex(1)
        this.live = {
          ...this.live,
          visible: true
        }
      }
      console.log('handleOpen', index)
    },
    videoReady (player) {
      this.player = player
      player.on('loadedmetadata', () => {
        player.currentTime(this.jumpStartDuration)
      })
      player.on('timeupdate', () => {
        if (this.jumpEndDuration > player.remainingTime() && player.remainingTime() > 0) {
          player.currentTime(player.duration())
        }
      })
      player.Resume({
        uuid: this.playUrl,
        getUuid: () => {
          return this.playUrl
        }
      })
      player.videoJsLive({})
      player.on('liveBtnClick', () => {
        this.showLive()
      })
      player.videoJsPlaylist({})
      player.on('playlistBtnClick', () => {
        this.showChapters()
      })
    },
    showMessage (msg) {
      this.player.Message(msg)
    },
    setHeaders (headers) {
      try {
        let url = new URL(this.playUrl)
        let hostname = url.hostname
        let filter = {
          urls: [`*://${hostname}:*/*`]
        }
        ipcRenderer.send('uploadRequestHeaders', filter, headers)
      } catch (e) {
        this.$message.error('糟糕...发生了一些错误，可能是 headers 有误')
        console.error(e)
      }
    },
    confirm () {
      this.checkUrl(true)
    },
    confirmLiveUrl (silence) {
      const _this = this
      axios
        .get(this.liveAddress, {
        })
        .then((res) => {
          const lines = res.data.split('\n')
          const data = []
          const temp = {}
          for (let line of lines) {
            const s = line.split(',')
            if (s.length > 1 && s[1].startsWith('http')) {
              if (!temp[s[0]]) {
                temp[s[0]] = {
                  name: s[0],
                  urls: []
                }
              }
              temp[s[0]].urls.push(s[1])
            }
          }
          for (let key of Object.keys(temp)) {
            data.push(temp[key])
          }
          _this.live = { ..._this.live, data: data }
          _this.$db.set('liveAddress', _this.liveAddress)
        })
        .catch((e) => {
          if (!silence) {
            this.$message.error('连接失败')
          }
        })
    },
    playVideo (subtitle, url) {
      let u = url || this.playUrl
      let sources = []
      if (u.indexOf('.m3u8') !== -1) {
        sources = [{
          src: u.split(';')[0],
          type: 'application/x-mpegURL'
        }]
      } else {
        sources = [{
          src: u.split(';')[0],
          type: 'video/mp4'
        }]
      }
      this.videoOptions = { ...this.videoOptions, sources: sources, _subtitle: subtitle }
    },
    checkUrl (notice) {
      let reg = new RegExp(
        /^((2[0-4]\d|25[0-5]|[01]?\d\d?)\.){3}(2[0-4]\d|25[0-5]|[01]?\d\d?)$/
      )
      if (this.ipAddress && (this.ipAddress.startsWith('http://') || this.ipAddress.endsWith(':52020'))) {
        this.ipAddress = this.ipAddress.replace('http://', '').replace(':52020', '')
      }
      if (reg.test(this.ipAddress)) {
        axios
          .get(`http://${this.ipAddress}:52020/playUrl`, {
            params: {
              enhance: true
            }
          })
          .then((res) => {
            this.playUrl = res.data.url
            this.playTitle = res.data.title
            this.jumpStartDuration = res.data.jumpStartDuration
            this.jumpEndDuration = res.data.jumpEndDuration
            this.setHeaders(res.data.headers || {})
            let key = 'videojs-resume:' + res.data.url
            let resumeFromTime = this.$db.get(`resume.${key.replace(/\./g, '_')}`)
            if (resumeFromTime && parseInt(resumeFromTime) > 180) {
              this.player.ResumeNow({
                uuid: this.playUrl,
                playbackOffset: 5,
                title: '恢复上次播放进度？',
                resumeButtonText: '是',
                cancelButtonText: '否',
                getUuid: () => {
                  return this.playUrl
                }
              })
              console.log('this.player.resumeModal resumeFromTime: ' + resumeFromTime)
            }
            this.playVideo(res.data.subtitle)
            if (this.live.playing) {
              this.live = {
                ...this.live,
                playing: false
              }
            }
            if (this.movies.playing) {
              this.movies = {
                ...this.movies,
                playing: false
              }
            }
            this.visible = false
            this.$nextTick(() => {
              this.checkInterface()
              this.$db.set('ipAddress', this.ipAddress)
            })
          })
          .catch((e) => {
            if (notice) {
              this.$message.error('连接失败')
            }
          })
      } else {
        this.$message.error('请输入正确的 IP 地址')
      }
    },
    checkInterface () {
      let _this = this
      const timer = window.setInterval(() => {
        setTimeout(function () {
          axios
            .get(`http://${_this.ipAddress}:52020/playUrl`, {
              params: {
                enhance: true
              }
            })
            .then((res) => {
              if (_this.playUrl !== res.data.url) {
                _this.playUrl = res.data.url
                _this.playTitle = res.data.title
                _this.setHeaders(res.data.headers || {})
                _this.playVideo(res.data.subtitle)
                _this.live = {
                  ..._this.live,
                  visible: false,
                  playing: false
                }
                _this.movies = {
                  ..._this.movies,
                  visible: false,
                  playing: false
                }
              }
            })
            .catch((e) => {
            })
        }, 0)
      }, 2000)
      // 清除定时器
      this.$once('hook:beforeDestroy', () => {
        clearInterval(timer)
      })
    },
    playLive (url, index) {
      let _this = this
      this.playVideo(null, url)
      _this.live = {
        ..._this.live,
        visible: false,
        playing: true,
        index: index
      }
      _this.movies = {
        ..._this.movies,
        playing: false
      }
      _this.player && _this.player.requestFullscreen()
    },
    playMovie (chapters, url, index) {
      this.playVideo(null, url)
      this.movies = {
        visible: false,
        chapters: chapters,
        index: index,
        playing: true
      }
      this.live = {
        ...this.live,
        visible: false,
        playing: false
      }
      this.playTitle = chapters[index].name
      this.player && this.player.requestFullscreen()
    },
    playMe (title, index) {
      let _this = this
      if (this.live.playing) {
        this.playLive(this.live.data[this.live.index].urls[index], this.live.index)
        _this.chapter = {
          ..._this.chapter,
          visible: false
        }
        return
      }
      if (this.movies.playing) {
        this.playMovie(this.movies.chapters, this.movies.chapters[index].url, index)
        return
      }
      axios
        .get(`http://${this.ipAddress}:52020/playMe`, {
          params: {
            title,
            index
          }
        })
        .then((res) => {
          if (res.data) {
            _this.chapter = {
              ..._this.chapter,
              visible: false
            }
            _this.player && _this.player.requestFullscreen()
          } else {
            _this.$message('播放失败，请检查手机是否还在播放器界面')
          }
        })
        .catch((e) => {
          _this.$message('播放失败，请检查手机是否还在播放器界面')
        })
    },
    showLive () {
      let _this = this
      _this.live = {
        ..._this.live,
        visible: true
      }
      if (_this.player && _this.player.isFullscreen()) {
        try {
          _this.player.exitFullscreen()
          ipcRenderer.send('changeSize', -1, -1)
        } catch (e) {
          this.$message.error('糟糕...发生了一些错误')
          console.error(e)
        }
      }
    },
    exitFull () {
      let _this = this
      if (_this.player && _this.player.isFullscreen()) {
        try {
          _this.player.exitFullscreen()
          ipcRenderer.send('changeSize', -1, -1)
        } catch (e) {
          this.$message.error('糟糕...发生了一些错误')
          console.error(e)
        }
      }
    },
    showChapters () {
      let _this = this
      if (this.live.playing) {
        let routes = this.live.data[this.live.index].urls.map((v, index) => ('线路' + (index + 1)))
        this.chapter = {
          ...this.chapter,
          visible: true
        }
        this.playList = routes
        this.exitFull()
        return
      }
      if (this.movies.playing) {
        let routes = this.movies.chapters.map((v, index) => v.name)
        this.chapter = {
          ...this.chapter,
          visible: true
        }
        this.playList = routes
        this.exitFull()
        return
      }
      axios
        .get(`http://${this.ipAddress}:52020/getPlayList`, {
          params: {}
        })
        .then((res) => {
          _this.playList = res.data
          _this.chapter = {
            ..._this.chapter,
            visible: true
          }
          if (_this.player && _this.player.isFullscreen()) {
            try {
              _this.player.exitFullscreen()
              ipcRenderer.send('changeSize', -1, -1)
            } catch (e) {
              this.$message.error('糟糕...发生了一些错误')
              console.error(e)
            }
          }
        })
        .catch((e) => {
          _this.$message('获取集数列表失败，请检查手机是否还在播放器界面')
        })
    },
    playNext () {
      console.log('playNext')
      if (this.movies.playing) {
        let index = this.movies.index + 1
        if (index >= this.movies.chapters.length) {
          return
        }
        this.playMovie(this.movies.chapters, this.movies.chapters[index].url, index)
        return
      }
      let _this = this
      axios
        .get(`http://${this.ipAddress}:52020/playNext`, {
          params: {}
        })
        .then((res) => {
          if (_this.chapter.visible) {
            _this.chapter = {
              ..._this.chapter,
              visible: false
            }
            _this.player && _this.player.requestFullscreen()
          }
          _this.showMessage('即将播放下一集')
        })
        .catch((e) => {
          _this.showMessage('播放下一集失败，请检查手机是否还在播放器界面')
        })
    }
  }
}
</script>

<style scoped>
.videoPlayer >>> .vjs_video_3-dimensions {
    width: 100%;
    height: 100%;
}
.videoPlayer >>> .video-js {
    width: 100%;
    height: 100%;
}
</style>
