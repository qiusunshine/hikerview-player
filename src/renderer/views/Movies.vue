<template>
  <div>
    <el-row :gutter="10" justify="space-around" style="padding: 10px 5px 10px 5px;">
      <el-col :span="12">
        <el-input
            v-model="api"
            placeholder="API地址，如http://xxx.cn/api.php/provide/vod/"
            clearable
            autofocus
            @keyup.enter.native="loadMovies">
          <i slot="prefix" class="el-input__icon el-icon-paperclip"></i>
          <el-button slot="append" icon="el-icon-check" @click="loadMovies"></el-button>
        </el-input>
      </el-col>
      <el-col :span="12">
        <el-input placeholder="请输入搜索关键词"
                  v-model="word"
                  clearable
                  @keyup.enter.native="loadMovies">
          <i slot="prefix" class="el-input__icon el-icon-search"></i>
          <el-button slot="append" icon="el-icon-search" @click="loadMovies"></el-button>
        </el-input>
      </el-col>
    </el-row>
    <el-row v-loading="loading"
            element-loading-text="拼命加载中"
            element-loading-spinner="el-icon-loading"
            element-loading-background="rgba(255, 255, 255, 0.7)"
            :gutter="4" justify="space-around" class="movies-list">
        <el-col :span="6" :md="4" :xl="4" :lg="4" v-for="(item, index) in movies" :key="item + '_' + index" class="chapter-item">
            <el-card :body-style="{ padding: '0px' }" style="margin: 5px;">
              <el-image
                  style="width: 100%; height: 100%"
                  :src="item.pic"
                  @click="showMovie(item, index)"
                  fit="fill"></el-image>
              <div class="movies-span" @click="showMovie(item, index)">
                <span class="movies-title">{{item.title}}</span>
                <div class="bottom clearfix">
                  <time class="time">{{ item.desc }}</time>
                </div>
              </div>
            </el-card>
        </el-col>
        <el-dialog
            :title="chaptersDialog.title"
            :visible.sync="chaptersDialog.visible"
            customClass="dark-dialog chapter-dialog"
            fullscreen
            append-to-body>
              <el-row :gutter="20" justify="space-around" v-for="(cs, i) in chapters" :key="'线路' + i">
                <div v-if="chapters.length > 1" style="margin: 10px 15px; color: white; font-weight: bold;">线路{{i + 1}}</div>
                <el-col :span="4" v-for="(it, index) in cs" :key="'线路' + i + '-' + it.name + '_' + index" class="chapter-item">
                  <el-button @click="playChapter(cs, it, index)" type="info">{{it.name}}</el-button>
                </el-col>
              </el-row>
              <span slot="footer" class="dialog-footer">
                <el-button type="primary" @click="handleDialogClose">取 消</el-button>
              </span>
        </el-dialog>
    </el-row>
  </div>
</template>

<script>
import Vue from 'vue'
import axios from 'axios'
import db from '../../universal/datastore'

export default {
  name: 'movies',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    playMovie: {
      type: Function,
      require: true,
      default: null
    }
  },
  data () {
    return {
      movies: [],
      api: '',
      word: '',
      loading: false,
      chapters: [],
      chaptersDialog: {
        visible: false,
        title: ''
      }
    }
  },
  mounted () {
    let api = this.$db.get('movie-api')
    if (api) {
      this.api = api
    }
    let word = this.$db.get('movie-word')
    if (word) {
      this.word = word
    }
  },
  beforeDestroy () {
  },
  methods: {
    handleDialogClose () {
      this.chaptersDialog = {
        visible: false,
        title: ''
      }
    },
    convertMovies (api, res) {
      let list = res.data.list
      let movies = []
      for (let it of list) {
        movies.push({
          id: it.vod_id,
          title: it.vod_name,
          url: api + '?ac=videolist&ids=' + it.vod_id,
          pic: it.vod_pic,
          desc: it.vod_remarks,
          playUrl: it.vod_play_url
        })
      }
      return movies
    },
    loadMovies () {
      const _this = this
      let api = this.api
      let word = this.word
      if (api.endsWith('/')) {
        api = api.substring(0, api.length - 1)
      }
      this.$db.set('movie-word', word)
      let wd = word.length <= 0 ? '' : '&wd=' + word
      this.loading = true
      axios
        .get(api + '?ac=list&pg=1' + wd, {
        })
        .then((res) => {
          let movies = _this.convertMovies(api, res)
          let nopics = movies.filter(it => !it.pic)
          if (nopics) {
            let ids = movies.map(it => it.id).join(',')
            axios
              .get(api + '?ac=videolist&ids=' + ids, {
              })
              .then((res) => {
                movies = _this.convertMovies(api, res)
                console.log('movies', movies)
                _this.movies = movies
                _this.$db.set('movie-api', api)
                _this.loading = false
              })
            return
          }
          console.log('movies', movies)
          _this.movies = movies
          _this.$db.set('movie-api', api)
          _this.loading = false
        })
        .catch((e) => {
          console.log(e)
          this.$message.error('连接失败')
          _this.loading = false
        })
    },
    showMovie (movie, index) {
      let chapters = []
      try {
        if (movie.playUrl) {
          let routes = movie.playUrl.split('$$$')
          for (let route of routes) {
            let cs = route.split('#')
            let csList = []
            for (let c of cs) {
              let nameUrl = c.split('$')
              if (nameUrl.length < 2 || nameUrl[1].includes('/share/') || !nameUrl[1].includes('http')) {
                continue
              }
              csList.push({
                name: nameUrl[0],
                url: nameUrl[1]
              })
            }
            if (csList.length > 0) {
              chapters.push(csList)
            }
          }
        }
      } catch (e) {
      }
      console.log('chapter', chapters)
      this.chapters = chapters
      if (chapters.length > 0) {
        this.chaptersDialog = {
          title: movie.title,
          visible: true
        }
      } else {
        this.$message.error('没有获取到可播放的选集')
      }
    },
    playChapter (chapters, chapter, index) {
      console.log('playChapter', chapters, chapter)
      this.chaptersDialog = {
        ...this.chaptersDialog,
        visible: false
      }
      this.playMovie(chapters, chapter.url, index)
    }
  },
  watch: {
    visible: {
      deep: true,
      handler (visible, old) {
        if (visible && this.api !== '' && this.movies.length <= 0) {
          this.loadMovies()
        }
        if (!visible && this.chaptersDialog.visible) {
          this.chaptersDialog = {
            ...this.chaptersDialog,
            visible: false
          }
        }
      }
    }
  }
}
</script>

<style scoped>
@media screen and (max-width:992px){
  .movies-list .el-image {
    width: calc(25vw - 10px) !important;
    height: calc(25vw / 3 * 4 - 12px) !important;
  }
}
@media screen and (min-width: 992px){
  .movies-list .el-image {
    width: calc(16.6vw - 10px) !important;
    height: calc(22.2vw - 10px) !important;
  }
}
.movies-title {
  font-weight: bold;
}
.movies-span {
  overflow: hidden;
  /* 单行显示 */
  white-space: nowrap;
  /* 字体超出加'...' */
  text-overflow: ellipsis;
  padding: 8px;
}
.chapter-item button{
  margin: 5px 3px;
  width: 100%;
  overflow: hidden;
}
</style>
