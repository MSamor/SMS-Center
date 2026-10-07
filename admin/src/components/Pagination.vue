<script setup>
import { computed } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
const props = defineProps({
  page: Number,
  total: Number,
  pageSize: { type: Number, default: 20 },
  disabled: Boolean,
});
const emit = defineEmits(['change']);
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));
</script>
<template>
  <div class="pagination">
    <span>共 {{ total }} 条记录</span>
    <div>
      <button
        class="icon-button"
        :disabled="disabled || page <= 1"
        aria-label="上一页"
        @click="emit('change', page - 1)"
      >
        <ChevronLeft :size="16" /></button
      ><span>{{ page }} / {{ pages }}</span
      ><button
        class="icon-button"
        :disabled="disabled || page >= pages"
        aria-label="下一页"
        @click="emit('change', page + 1)"
      >
        <ChevronRight :size="16" />
      </button>
    </div>
  </div>
</template>
