
import { useFlywheelStore, KnowledgeContext, ActionOutcome } from '../store/flywheelStore';

export const useFlywheel = (context: KnowledgeContext) => {
  const recordAction = useFlywheelStore((state) => state.recordAction);

  const track = (actionName: string) => {
    return {
      success: () => recordAction(context, actionName, 'ACCEPTED'),
      fail: () => recordAction(context, actionName, 'REJECTED'),
      modify: () => recordAction(context, actionName, 'MODIFIED'),
      ignore: () => recordAction(context, actionName, 'IGNORED'),
    };
  };

  return { track };
};
