import { useToast } from "./ShadCN/hooks/use-toast";

export function useApiResponseToast() {
  const { toast } = useToast();

  const handleApiResponse = (response) => {
    if (response.warning) {
      toast({
        title: "Warning",
        description: response.warning,
        variant: "warning",
      });
    }
  };
  return handleApiResponse;
}
