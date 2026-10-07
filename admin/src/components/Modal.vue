<script setup>
import { onMounted, onBeforeUnmount, ref, useId } from 'vue';
import { X } from 'lucide-vue-next';
const props = defineProps({ title: { type: String, required: true }, wide: Boolean });
const emit = defineEmits(['close']);
const dialog = ref(null),
  titleId = useId();
let previous;
function close(event) {
  if (event.key === 'Escape') emit('close');
}
onMounted(() => {
  previous = document.activeElement;
  dialog.value.showModal();
  document.body.style.overflow = 'hidden';
});
onBeforeUnmount(() => {
  document.body.style.overflow = '';
  previous?.focus();
});
</script>
<template>
  <Teleport to="body"
    ><dialog
      ref="dialog"
      class="modal"
      :class="{ wide: props.wide }"
      :aria-labelledby="titleId"
      @keydown="close"
      @cancel.prevent="emit('close')"
      @click="
        (event) => {
          if (event.target === dialog) emit('close');
        }
      "
    >
      <div class="modal-heading">
        <h2 :id="titleId">{{ title }}</h2>
        <button class="icon-button" aria-label="关闭弹窗" @click="emit('close')">
          <X :size="20" />
        </button>
      </div>
      <slot /></dialog
  ></Teleport>
</template>
