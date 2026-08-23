import { Link } from "@tanstack/react-router";
import { Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type PlanLimitInfo = { title: string; description: string } | null;

export function PlanLimitDialog({
  info,
  onClose,
}: {
  info: PlanLimitInfo;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!info} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange/15 text-brand-orange">
            <Crown className="h-7 w-7" />
          </div>
          <DialogTitle className="mt-3 text-center text-lg font-extrabold">
            {info?.title ?? "Limit Aşıldı"}
          </DialogTitle>
          <DialogDescription className="text-center">{info?.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Link to="/pdks-yonetim/abonelik" onClick={onClose} className="w-full">
            <Button className="h-12 w-full bg-brand-orange font-semibold text-brand-orange-foreground hover:bg-brand-orange/90">
              <Sparkles className="mr-2 h-4 w-4" />
              Paketinizi Yükseltin
            </Button>
          </Link>
          <Button variant="ghost" className="h-11 w-full" onClick={onClose}>
            Daha Sonra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
