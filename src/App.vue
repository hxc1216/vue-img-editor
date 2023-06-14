<script>
import Vue from 'vue';
import ImgEditor from 'vue-img-editor-xx';

import file from "./assets/img/example.jpeg"

export default Vue.extend({
  name: 'ServeDev',
  components: {
    ImgEditor
  },
  data(){
    return{
      value:"",
    }
  },
  mounted(){
    const img = new Image()
    img.src = file
    img.onload = ()=>{
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img,0,0,img.width,img.height);
      const src = canvas.toDataURL();
      this.value = src;
    }
  }
});
</script>

<template>
  <div id="app">
    <img-editor v-if="value" v-model="value" />
  </div>
</template>

<style>
#app{
  width: 750px;
  height: 400px;
}
</style>
