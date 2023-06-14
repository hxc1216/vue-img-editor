import "./src/assets/iconfont";
import "./src/assets/iconfont.css";
import ImgEditor from "./src/img-editor.vue";

const coms = {
  ImgEditor,
};

let editorUI = {};
editorUI.install = Vue => {
  for (let i in coms) {
    Vue.component(i, coms[i]);
  }
};

export default editorUI;
export { ImgEditor };
