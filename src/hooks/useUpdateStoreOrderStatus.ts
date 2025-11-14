import { useMutation, useQueryClient } from "@tanstack/react-query";

import api, { type StoreOrderListItem, type StoreOrderStatus } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

interface UpdateStatusVariables {
  orderId: string;
  status: StoreOrderStatus;
}

export const useUpdateStoreOrderStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<StoreOrderListItem, unknown, UpdateStatusVariables>({
    mutationFn: ({ orderId, status }: UpdateStatusVariables) =>
      api.admin.store.orders.updateStatus(orderId, { status }),
    onSuccess: (_, variables) => {
      toast({ title: "Užsakymo būsena atnaujinta" });
      queryClient.invalidateQueries({ queryKey: ["admin-store-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-store-order", variables.orderId] });
    },
    onError: () => {
      toast({
        title: "Nepavyko atnaujinti būsenos",
        description: "Bandykite dar kartą.",
        variant: "destructive",
      });
    },
  });
};
