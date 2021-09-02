<template>
  <img alt="Vue logo" src="./assets/logo.png" />
  <HelloWorld msg="Hello Vue 3.0 + Vite" />
  <div class="fx-class">{{message}}</div>
  <!-- <div class="fx-class">{{MSG}}</div> -->
  <p>Edit <code>components/HelloWorld.vue</code> to test hot module replacement.</p>
</template>

<script>
import HelloWorld from './components/HelloWorld.vue'
// import { msg } from 'my-virtual-file'

export default {
  name: 'App',
  components: {
    HelloWorld
  },
  data () {
    return {
      message: 'FX-VITE'
      // MSG: msg
    }
  }
}
</script>
<style scoped>
p {
  color: red;
}
</style>
<style>
.fx-class {
  color: green
}
</style>
