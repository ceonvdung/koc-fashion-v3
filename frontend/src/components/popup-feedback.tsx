import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { InputType } from '@/server/services/input-learner';

const QUICK_TAGS: Partial<Record<InputType, string[]>> = {
  face: ['Face chua giong', 'Mau khong chinh xac', 'Khong ro net', 'Anh mo', 'Dac diem khuon mat sai'],
  outfit: ['Mau sai', 'Chat lieu khong dung', 'Kieu dang khac', 'Hoa tiet khong khop', 'Anh mo'],
  product: ['Hinh dang sai', 'Mau khong chinh xac', 'Logo khong khop', 'Khong ro net'],
  scene: ['Boi canh khong dung', 'Anh sang sai', 'Tone mau khong khop'],
};

interface PopupFeedbackProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: { quickTags: string[]; freeText: string }) => void;
  inputType: InputType;
  inputLabel: string;
}

export function PopupFeedback({ isOpen, onClose, onSubmit, inputType, inputLabel }: PopupFeedbackProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');

  const tags = QUICK_TAGS[inputType] || [];

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    onSubmit({ quickTags: selectedTags, freeText });
    setSelectedTags([]);
    setFreeText('');
  };

  const handleClose = () => {
    setSelectedTags([]);
    setFreeText('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Ban xoa anh {inputLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Chon ly do de AI hoc lai chinh xac hon:
          </p>

          <div className="space-y-2">
            {tags.map((tag) => (
              <div key={tag} className="flex items-center space-x-2">
                <Checkbox
                  id={tag}
                  checked={selectedTags.includes(tag)}
                  onCheckedChange={() => handleToggleTag(tag)}
                />
                <Label htmlFor={tag} className="text-sm font-normal cursor-pointer">
                  {tag}
                </Label>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-note" className="text-sm font-medium">
              Ghi chu them (tuy chon)
            </Label>
            <Textarea
              id="feedback-note"
              placeholder="Vi du: Mat trong gia hon input..."
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Bo qua
          </Button>
          <Button onClick={handleSubmit}>
            Gui feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
