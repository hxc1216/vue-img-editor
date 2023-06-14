### 简述
基于vue的图片编辑组件

![image](https://github.com/hxc1216/vue-img-editor/assets/79068752/71a37560-7c6a-4e3f-82e8-55919de0af3b)


### 示例
```sh
// 安装 
npm i vue-img-editor-xx
```
```js
// 全局导入 main.js
import ImgEditor from 'vue-img-editor-xx'
Vue.use(ImgEditor)

// 单独导入
import {ImgEditor} from 'vue-img-editor-xx';

// 添加组件
{
    components: {
        ImgEditor
    },
    data:{
        value:"", // 图片地址
    },
    methods:{
        // 图片更改回调
        onChange(src){
            // 更改后的图片地址
            console.log(src)
        }
    }
}

// 使用
<template>
    <!-- pattern: edit | view -->
    <img-editor pattern="edit" v-model="value"  @change="onChange" />
</template>
```
