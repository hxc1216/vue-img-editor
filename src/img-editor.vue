<template>
  <div class="img-editor-wrap" :style="{background}">
    <div class="canvas-wrap">
      <canvas class="canvas" ref="canvas" @mousewheel="mousewheel" @mousedown="moveDown" @mousemove="move" @mouseup="moveUp" @mouseenter="mouseenter" :style="canvasStyle"></canvas>
      <div v-for="(item, index) in textArr" :key="index" :style="{ left: item.x + 'px', top: item.y + 'px' }" class="add-text-wrap">
        <Input ref="textarea" v-if="item.editing" type="textarea" :autosize="{ minRows: 1, maxRows: 4 }" placeholder="文本" v-model="item.text" @blur="addTexted(item)" resize="none"> </Input>
      </div>
    </div>
    <div class="img-editor-controls">
      <div>
        <i class="iconfont icon-zoom-in" @click="zoomout"></i>
        <span> {{ (zoom * 100).toFixed(0) + "%" }} </span>
        <i class="iconfont icon-zoom-out" @click="zoomin"></i>
      </div>
      <div v-for="(item, index) in opModels" :key="index">
        <span @click="handleClick(item)" v-if="item.type !== 'draw'" v-show="item.pattern.includes(pattern)">
          <i :class="item.icon"></i>
          {{ item.title }}
        </span>
        <Dropdown v-else placement="top" v-show="item.pattern.includes(pattern)">
          <span class="el-dropdown-link" @click="inDraw"> {{ item.title }}<i class="el-icon-arrow-down el-icon--right"></i> </span>
          <DropdownMenu slot="dropdown">
            <DropdownItem v-for="(model, index) in drawModels" :key="index" @click.native="inDraw(item, model)">
              <i :class="model.icon"> </i>
              {{ model.title }}
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </div>
  </div>
</template>

<script>
import {
  Input,
  Dropdown,
  DropdownMenu,
  DropdownItem,
} from 'element-ui';
export default {
  components:{
    Input,
    Dropdown,
    DropdownMenu,
    DropdownItem
  },
  props: {
    /** 图片路径 */
    value: {
      type: String,
      required: true,
    },
    /** 操作方式 编辑(edit) or 查看(view) */
    pattern: {
      type: String,
      default: "edit",
    },
    background:{
      type:String,
      default:"#000"
    }
  },
  data() {
    return {
      ctx: null,
      width: null,
      height: null,
      clientWidth: 0,
      clientHeight: 0,
      scaleX: null,
      scaleY: null,
      imgStack: [],
      opModels: [
        {
          type: "drag",
          title: "移动",
          icon: "iconfont icon-yidong",
          pattern: ["edit", "view"],
          callback: this.inMove,
        },
        {
          type: "text",
          title: "文字",
          icon: "iconfont icon-wenzi1",
          pattern: ["edit"],
          callback: this.inText,
        },
        {
          type: "draw",
          title: "标记",
          icon: "iconfont icon-ic_common_square",
          pattern: ["edit"],
          callback: this.isDraw,
        },
        {
          type: "revert",
          title: "撤回",
          icon: "iconfont icon-line-070",
          pattern: ["edit"],
          callback: this.undo,
        },
        {
          type: "download",
          title: "下载",
          icon: "iconfont icon-xiazai",
          callback: this.downloadCanvasIamge,
          pattern: ["edit"],
        },
        {
          type: "clean",
          title: "清空",
          icon: "iconfont icon-delete",
          callback: this.clean,
          pattern: ["edit"],
        },
      ],
      drawModels: [
        {
          type: 1,
          title: "矩形",
          icon: "iconfont icon-juxing",
        },
        {
          type: 2,
          title: "圆形",
          icon: "iconfont icon-24gl-circle",
        },
        {
          type: 3,
          title: "箭头",
          icon: "iconfont icon-xiaoshangjiantou",
        },
      ],
      textInfo: {
        padding: 4,
        x: 0,
        y: 0,
        content: "",
        dragging: !1,
        display: !1,
        size: {
          rows: 1,
          width: 10,
        },
      },

      img: null,
      zoom: 1,
      canvasPos: [0, 0],
      startPos: [], // 移动坐标
      isMove: true, // 移动
      moving: false,
      isText: false, // 添加文字
      isdraw: false, // 绘制图形
      drawing: false, // 绘制图形ing
      drawHistory: [],
      drawMap: { type: 1, beginX: "", beginY: "" }, // 1 矩形 2 圆 3 箭头

      textArr: [],
    };
  },
  mounted() {
    this.initViewImg();
  },
  methods: {
    /** 初始化编辑器 */
    initViewImg() {
      // this.drawer = new Drawer(canvas);
      const canvas = this.$refs.canvas;
      this.ctx = canvas.getContext("2d");
      const wrap = document.querySelector(".canvas-wrap");
      this.img = new Image();
      this.img.src = this.value;
      this.img.crossOrigin = "";
      this.img.onload = () => {
        const rate = this.img.width / this.img.height;
        const canvasRate = wrap.clientWidth / wrap.clientHeight;
        let width, height;
        if (rate < 1) {
          height = this.img.height;
          width = height * canvasRate;
        } else {
          width = this.img.width;
          height = width / canvasRate;
        }
        canvas.width = width;
        canvas.height = height;
        this.width = width;
        this.height = height;
        let points = this.aspectFit(
          this.img.width,
          this.img.height,
          width,
          height
        );
        // this.ctx.scale(
        //   this.width / canvas.clientWidth,
        //   this.height / canvas.clientHeight
        // );
        this.scaleX = this.width / canvas.clientWidth;
        this.scaleY = this.height / canvas.clientHeight;
        this.drawImage(this.img, ...points);
      };
    },
    /** 图片等比缩放至容器 返回canvas渲染参数 */
    aspectFit(imageWidth, imageHeight, canvasWidth, canvasHeight) {
      const imageRate = imageWidth / imageHeight;
      const canvasRate = canvasWidth / canvasHeight;
      let [dx, dy, dw, dh] = [];
      if (imageRate >= canvasRate) {
        dw = canvasWidth;
        dh = canvasWidth / imageRate;
      } else {
        dh = canvasHeight;
        dw = canvasHeight * imageRate;
      }
      dx = (canvasWidth - dw) / 2;
      dy = (canvasHeight - dh) / 2;
      return [dx, dy, dw, dh];
    },
    /** 绘制图像 */
    drawImage(...params) {
      this.ctx.drawImage(...params);
      this.addStack();
    },

    /** 增加操作栈记录 */
    addStack() {
      const imgData = this.ctx.getImageData(0, 0, this.width, this.height);
      this.imgStack.push(imgData);
      this.$emit("change", this.getImgBase64());
    },

    /** 获取base64格式的图片 */
    getImgBase64() {
      const canvas = this.$refs.canvas;
      return canvas.toDataURL("image/png");
    },

    /** 操作按钮事件转发 */
    handleClick(model) {
      model.callback();
    },

    /** 放大 */
    zoomin() {
      this.inMove();
      if (this.zoom >= 5 || !this.isMove) return;
      this.zoom += 0.1;
    },
    /** 缩小 */
    zoomout() {
      this.inMove();
      if (this.zoom <= 1 || !this.isMove) {
        this.zoom = 1;
        return;
      }
      this.zoom -= 0.1;
    },

    /** 进入可拖动状态 */
    inMove() {
      this.textEditEnd();
      this.isMove = true;
      this.isdraw = false;
      this.isText = false;
    },

    /** 进入添加文字状态 */
    inText() {
      this.zoom = 1;
      this.isMove = false;
      this.isdraw = false;
      this.isText = true;
    },
    /** 进入添加图形状态 */
    inDraw(item, model) {
      if (!model || !model.type) return;
      // this.zoom = 1;
      this.isMove = false;
      this.isdraw = true;
      this.isText = false;
      item.title = model.title;
      this.drawMap.type = model.type;
    },

    /** 撤销 */
    undo() {
      if (this.imgStack.length > 1) {
        this.imgStack.pop();
        const savedContent = this.imgStack[this.imgStack.length - 1];
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.putImageData(savedContent, 0, 0);
        this.$emit("change", this.getImgBase64());
      }
    },

    /** 下载 */
    downloadCanvasIamge() {
      const base64 = this.getImgBase64();
      const a = document.createElement("a");
      a.href = base64;
      a.download = "rs-" + Date.now() + ".png";
      a.target = "_blank";
      a.style.display = "none";
      let event = new MouseEvent("click");
      a.dispatchEvent(event);
      // a.click();
    },

    /** 清空 */
    clean() {
      const imgData = this.imgStack.shift();
      this.imgStack = [imgData];
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ctx.putImageData(imgData, 0, 0);
      this.$emit("change", this.getImgBase64());
    },

    /** 鼠标滚轮 */
    mousewheel(e) {
      e.preventDefault();
      this.textEditEnd();
      if (e.wheelDelta > 0) {
        if (this.zoom >= 5) return;
        this.zoom += 0.1;
      } else {
        if (this.zoom <= 1) return;
        this.zoom -= 0.1;
      }
    },
    /** 鼠标按下 */
    moveDown(e) {
      // 添加文字的状态
      if (this.isText) {
        this.addTextarea(e);
        return;
      }

      // 绘制图形
      if (this.isdraw) {
        this.drawing = true;
        const a = this.getCanvasPoint(e.layerX, e.layerY);
        this.drawMap.beginX = a.layerX;
        this.drawMap.beginY = a.layerY;
        return;
      }

      if (this.isMove) {
        this.moving = true;
        this.startPos = [e.x, e.y];
      }
    },
    /** 鼠标抬起 */
    moveUp(e) {
      if (this.isdraw) {
        this.drawing = false;
        this.addStack();
      }
      this.moving = false;
      this.startPos = [];
    },
    /** 获取缩放拖动后的x，y坐标 */
    getCanvasPoint(x, y) {
      const wrap = document.querySelector(".canvas-wrap");
      const layerX =
        x + (wrap.clientWidth * (this.zoom - 1)) / 2 - this.canvasPos[0];
      const layerY =
        y + (wrap.clientHeight * (this.zoom - 1)) / 2 - this.canvasPos[1];
      console.log((wrap.clientWidth * (this.zoom - 1)) / 2);
      return { layerX: layerX / this.zoom, layerY: layerY / this.zoom };
    },
    /** 移动鼠标 */
    move(e) {
      // 移动
      if (this.moving) {
        this.drag(e);
      } else if (this.drawing) {
        let a = this.getCanvasPoint(e.layerX, e.layerY);
        // 画图形
        switch (this.drawMap.type) {
          case 1:
            this.drawRect(a, this.ctx);
            break;
          case 2:
            this.drawEllipse(this.ctx, a);
            break;
          case 3:
            this.drawArrow(
              this.drawMap.beginX,
              this.drawMap.beginY,
              a,
              this.ctx
            );
            break;
        }
      }
    },
    /** 鼠标移入 情况操作ing状态 */
    mouseenter() {
      this.moving = false;
      this.drawing = false;
    },
    /** 鼠标移出 */
    mouseleave() {
      this.moving = false;
    },
    /** 拖动 */
    drag(e) {
      const effsetX = e.x - this.startPos[0];
      const effsetY = e.y - this.startPos[1];
      this.startPos = [e.x, e.y];
      const x = (this.canvasPos[0] += effsetX);
      const y = (this.canvasPos[1] += effsetY);
      this.canvasPos = [x, y];
    },
    /** 添加文字 */
    addTextarea(e) {
      const temp = this.textArr.find((a) => a.editing);
      if (temp) {
        this.textEditEnd();
        return;
      }
      this.textArr.push({
        text: "",
        x: e.offsetX,
        y: e.offsetY,
        editing: true,
      });
      setTimeout(() => {
        this.$refs.textarea[0].focus();
      }, 50);
    },
    /** 添加文字完毕 */
    addTexted(row) {
      console.log("🚀🚀🚀 ~ file: img-editor.vue:438 ~ addTexted ~ r:", row.text)
      this.textEditEnd();
      this.ctx.font = `${
        13 * Math.max(this.scaleX, this.scaleY)
      }px '微软雅黑' `;
      this.ctx.fillStyle = "red";
      this.ctx.textBaseLine = "top";
      this.drawText(row.text, row.x * this.scaleX, row.y * this.scaleY);
      this.addStack();
    },
    /** canvas文字换行 */
    drawText(str, x, y) {
      let strArr = str.split("\n").map((item) => this.splitArr(item, 21));
      strArr = [].concat(...strArr);
      for (let i = 0; i < strArr.length; i++) {
        const text = strArr[i];
        this.ctx.fillText(text, x + 5, y + 20 * this.scaleY * i + 15);
      }
    },
    /** 分隔字符串 */
    splitArr(str, maxLen) {
      let result = [];
      let temp = "";
      let len = 0;
      for (let i = 0; i < str.length; i++) {
        let char = str.charAt(i);
        let code = str.charCodeAt(i);
        if (code > 255) {
          // 中文字符
          if (len + 2 > maxLen) {
            // 超过最大长度，存入结果并清空
            result.push(temp);
            temp = "";
            len = 0;
          }
          temp += char;
          len += 2;
        } else {
          // 英文字符
          if (len + 1 > maxLen) {
            // 超过最大长度，存入结果并清空
            result.push(temp);
            temp = "";
            len = 0;
          }
          temp += char;
          len += 1;
        }
      }
      result.push(temp); // 将最后一段存入结果
      return result;
    },
    /** 结束文字编辑状态 */
    textEditEnd() {
      const temp = this.textArr.find((a) => a.editing);
      if (temp) {
        temp.editing = false;
      }
    },

    getTransLate(x, y) {
      if (!this.clientWidth) {
        const canvas = document.querySelector(".canvas-wrap");
        this.clientWidth = canvas.clientWidth;
        this.clientHeight = canvas.clientHeight;
      }

      let left =
        (this.clientWidth * this.zoom - this.clientWidth) / 2 +
        this.canvasPos[0];
      let top =
        (this.clientHeight * this.zoom - this.clientHeight) / 2 +
        this.canvasPos[1];

      return [x / this.zoom - left, y / this.zoom - top];
    },

    /** 矩形 */
    drawRect(e, ctx) {
      // 保存画布内容
      const savedContent = this.imgStack[this.imgStack.length - 1];
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ctx.putImageData(savedContent, 0, 0);
      ctx.beginPath();
      let tx = e.layerX - this.drawMap.beginX;
      let ty = e.layerY - this.drawMap.beginY;
      ctx.lineWidth = 1 * Math.max(this.scaleX, this.scaleY);
      ctx.rect(
        this.drawMap.beginX * this.scaleX,
        this.drawMap.beginY * this.scaleY,
        tx * this.scaleX,
        ty * this.scaleY
      );
      ctx.strokeStyle = "red";
      ctx.stroke();
    },

    /** 椭圆 */
    drawEllipse(canvas, e) {
      // canvas.save();
      // 保存画布内容
      const savedContent = this.imgStack[this.imgStack.length - 1];
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ctx.putImageData(savedContent, 0, 0);

      let { beginX, beginY } = this.drawMap;
      beginX = beginX * this.scaleX;
      beginY = beginY * this.scaleY;
      const endX = e.layerX * this.scaleX,
        endY = e.layerY * this.scaleY;
      const centerX =
        Math.abs(endX - beginX) / 2 + (endX > beginX ? beginX : endX);
      const centerY =
        Math.abs(endY - beginY) / 2 + (endY > beginY ? beginY : endY);
      const radiusX = Math.abs(endX - beginX) / 2;
      const radiusY = Math.abs(endY - beginY) / 2;

      this.ctx.beginPath();
      this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      this.ctx.lineWidth = 1 * Math.max(this.scaleX, this.scaleY);
      this.ctx.strokeStyle = "red";
      this.ctx.stroke();
    },

    /** 箭头 */
    drawArrow(beginx, beginy, e, canvas) {
      // 保存画布内容
      const savedContent = this.imgStack[this.imgStack.length - 1];
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ctx.putImageData(savedContent, 0, 0);

      // 画直线
      const startX = beginx * this.scaleX;
      const startY = beginy * this.scaleY;
      const endX = e.layerX * this.scaleX;
      const endY = e.layerY * this.scaleY;
      canvas.beginPath();
      canvas.lineWidth = 1 * Math.max(this.scaleX, this.scaleY);
      canvas.moveTo(startX, startY);
      canvas.lineTo(endX, endY);
      canvas.stroke();

      // 画箭头
      const arrowLength = 15;
      const arrowWidth = 5;
      const angle = Math.atan2(endY - startY, endX - startX);
      const arrowStartX = endX - Math.cos(angle) * arrowLength;
      const arrowStartY = endY - Math.sin(angle) * arrowLength;
      const arrowLeftX =
        arrowStartX + Math.cos(angle - Math.PI / 2) * arrowWidth;
      const arrowLeftY =
        arrowStartY + Math.sin(angle - Math.PI / 2) * arrowWidth;
      const arrowRightX =
        arrowStartX + Math.cos(angle + Math.PI / 2) * arrowWidth;
      const arrowRightY =
        arrowStartY + Math.sin(angle + Math.PI / 2) * arrowWidth;
      canvas.beginPath();
      canvas.moveTo(arrowStartX, arrowStartY);
      canvas.lineTo(endX, endY);
      canvas.lineTo(arrowLeftX, arrowLeftY);
      canvas.lineTo(arrowRightX, arrowRightY);
      canvas.lineTo(endX, endY);
      canvas.closePath();
      canvas.strokeStyle = "red";
      canvas.fillStyle = "red";
      canvas.fill();
    },
  },
  computed: {
    /** canvas缩放拖动控制 */
    canvasStyle() {
      if (this.zoom == 1) {
        this.canvasPos = [0, 0];
      }
      const canvas = document.querySelector(".canvas-wrap");
      if (!canvas) return;
      const maxW = (canvas.clientWidth * this.zoom - canvas.clientWidth) / 2;
      const maxH = (canvas.clientHeight * this.zoom - canvas.clientHeight) / 2;

      const left =
        this.canvasPos[0] > maxW
          ? maxW
          : this.canvasPos[0] < -maxW
          ? -maxW
          : this.canvasPos[0];
      const top =
        this.canvasPos[1] > maxH
          ? maxH
          : this.canvasPos[1] < -maxH
          ? -maxH
          : this.canvasPos[1];

      this.canvasPos = [left, top];

      return {
        transform: `translate(${left}px, ${top}px) scale(${this.zoom})`,
        cursor: this.isMove ? "move" : "default",
      };
    },
  },
};
</script>

<style scoped>
.img-editor-wrap {
  width: 100%;
  height: 100%;
  position: relative;
}

.canvas-wrap {
  width: 100%;
  height: calc(100% - 50px);
  overflow: hidden;
  transform: translate(0, 0);
  position: relative;
}
.canvas {
  width: 100%;
  height: 100%;
}

.img-editor-controls {
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  bottom: 0;
  width: 100%;
  padding: 0 20px;
  color: #000;
  background: #fff;
  border: 0.1px solid rgba($color: #000, $alpha: 0.2);
  user-select: none;
  font-size: 14px;
}

.img-editor-controls>div{
margin: 0 20px;
}

.img-editor-controls>div>span,.img-editor-controls>div>i{
cursor: pointer;
}

/deep/.add-text-wrap {
  position: absolute;


}

/deep/.add-text-wrap textarea {
    border: 1px solid #fff;
    background: transparent;
    width: auto;
    line-height: 20px;
    font-size: 13px;
    color: red;
  }

.el-dropdown {
  color: #000;
  cursor: pointer;
}

.icon-xiaoshangjiantou {
  transform: rotate(45deg);
}
</style>
