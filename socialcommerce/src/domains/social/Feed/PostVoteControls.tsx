import React from 'react';
import { VoteButton } from '../shared/VoteButton';
import type { VoteDirection } from '../../../shared/types/domain';

interface PostVoteControlsProps {
  score: number;
  userVote?: VoteDirection | null;
  onVote: (direction: VoteDirection | null) => void;
  orientation?: 'vertical' | 'horizontal';
}

export const PostVoteControls: React.FC<PostVoteControlsProps> = React.memo(({
  score,
  userVote,
  onVote,
  orientation = 'vertical',
}) => (
  <VoteButton
    score={score}
    userVote={userVote}
    onVote={onVote}
    orientation={orientation}
  />
));
