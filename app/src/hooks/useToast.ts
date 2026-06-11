import { toast } from 'sonner';

export function useToast() {
  const success = (message: string, description?: string) => {
    toast.success(message, {
      description,
      style: { background: '#F0F5F0', color: '#5B8C5A', border: '1px solid #5B8C5A' },
    });
  };

  const error = (message: string, description?: string) => {
    toast.error(message, {
      description,
      style: { background: '#FDF2F0', color: '#B85C50', border: '1px solid #B85C50' },
    });
  };

  const info = (message: string, description?: string) => {
    toast(message, {
      description,
      style: { background: '#F0F3F7', color: '#5A7FA8', border: '1px solid #5A7FA8' },
    });
  };

  const warning = (message: string, description?: string) => {
    toast(message, {
      description,
      style: { background: '#FDF8F0', color: '#C49A3C', border: '1px solid #C49A3C' },
    });
  };

  const loading = (message: string, promise?: Promise<unknown>) => {
    if (promise) {
      return toast.promise(promise, {
        loading: message + '...',
        success: message + '完成',
        error: message + '失败',
      });
    }
    return toast.loading(message + '...');
  };

  return { success, error, info, warning, loading };
}

// Simple direct exports for convenience
const simpleToast = {
  success: (message?: string) =>
    toast.success(message ?? '操作成功', {
      style: { border: '1px solid #5B8C5A' },
    }),

  error: (message?: string) =>
    toast.error(message ?? '操作失败', {
      style: { border: '1px solid #B85C50' },
    }),

  loading: (message?: string) =>
    toast.loading(message ?? '加载中...', {
      style: { border: '1px solid #5A7FA8' },
    }),

  info: (message?: string) =>
    toast.info(message ?? '提示信息', {
      style: { border: '1px solid #C49A3C' },
    }),

  dismiss: (id?: string | number) => {
    if (id) {
      toast.dismiss(id);
    } else {
      toast.dismiss();
    }
  },
};

export { simpleToast as toast };
export default simpleToast;

// Convenience exports for direct usage
export const toastSuccess = (msg: string, desc?: string) => toast.success(msg, { description: desc });
export const toastError = (msg: string, desc?: string) => toast.error(msg, { description: desc });
export const toastInfo = (msg: string, desc?: string) => toast.info(msg, { description: desc });
export const toastWarning = (msg: string, desc?: string) => toast.warning(msg, { description: desc });

// Preset Chinese messages
export const MSG = {
  saved: '已保存',
  saveFailed: '保存失败，请重试',
  deleted: '已删除',
  deleteFailed: '删除失败',
  created: '创建成功',
  updated: '更新成功',
  copied: '已复制到剪贴板',
  exportStarted: '开始导出...',
  generateStarted: '正在生成...',
  generateDone: '生成完成',
  noUndo: '没有可撤销的操作',
  noRedo: '没有可重做的操作',
  sceneAdded: '场景已添加',
  sceneDeleted: '场景已删除',
  sceneRenamed: '场景已重命名',
  blockAdded: '已添加新段落',
  blockDeleted: '已删除段落',
  blockDuplicated: '已复制段落',
  characterSaved: '角色已保存',
  characterDeleted: '角色已删除',
  imageUploaded: '图片已上传（模拟）',
  dirtyConfirm: '有未保存的更改，确定要离开吗？',
};
