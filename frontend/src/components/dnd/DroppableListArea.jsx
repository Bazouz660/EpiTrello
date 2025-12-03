import { useDroppable } from '@dnd-kit/core';
import PropTypes from 'prop-types';

const DroppableListArea = ({ id, children }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `list-drop-${id}`,
    data: {
      type: 'list-container',
      listId: id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden pr-1 transition-colors duration-200 ${
        isOver ? 'rounded-lg bg-white/10' : ''
      }`}
    >
      {children}
    </div>
  );
};

DroppableListArea.propTypes = {
  id: PropTypes.string.isRequired,
  children: PropTypes.node,
};

DroppableListArea.defaultProps = {
  children: null,
};

export default DroppableListArea;
