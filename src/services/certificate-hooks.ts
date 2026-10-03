import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { unwrapDashboard } from "@/services/dashboard-hooks";
import type {
  CertificateRegistry,
  Certificate,
  StoredCertificateTemplate,
  CertificateVerification,
} from "@/domain/certificates";
import {
  getCertificateRegistry,
  createCertificate,
  cancelCertificate,
  getCertificateTemplate,
  updateCertificateTemplate,
  getCertificateDocument,
  getCertificateVerification,
} from "@/admin-modules.functions";

export function useCertificates(offset = 0, moduleId: string | null = null, search = "") {
  const { user } = useAuth();
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ["certificates", user?.id, offset, moduleId, search],
    enabled: !!user,
    queryFn: () =>
      unwrapDashboard<CertificateRegistry>(
        getCertificateRegistry({ data: { offset, limit: 20, moduleId, search } }),
      ),
  });
  const refresh = () => cache.invalidateQueries({ queryKey: ["certificates"] });
  const issue = useMutation({
    mutationFn: (data: { userId: string; moduleId: string }) =>
      unwrapDashboard<Certificate>(createCertificate({ data })),
    onSuccess: refresh,
  });
  const revoke = useMutation({
    mutationFn: (data: { id: string; reason: string }) =>
      unwrapDashboard<Certificate>(cancelCertificate({ data })),
    onSuccess: refresh,
  });
  return { ...query, issue, revoke };
}
export function useCertificateTemplate() {
  const { user } = useAuth();
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ["certificate-template", user?.id],
    enabled: user?.role === "super_admin",
    queryFn: () => unwrapDashboard<StoredCertificateTemplate>(getCertificateTemplate()),
  });
  const save = useMutation({
    mutationFn: (data: StoredCertificateTemplate) =>
      unwrapDashboard<StoredCertificateTemplate>(updateCertificateTemplate({ data })),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["certificate-template"] }),
  });
  return { ...query, save };
}
export function useCertificateDocument(id: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["certificates", "document", user?.id, id],
    enabled: !!user && !!id,
    queryFn: () => unwrapDashboard<Certificate>(getCertificateDocument({ data: id })),
  });
}
export function useCertificateVerification(reference: string) {
  return useQuery({
    queryKey: ["certificate-verify", reference],
    retry: false,
    queryFn: () =>
      unwrapDashboard<CertificateVerification>(getCertificateVerification({ data: reference })),
  });
}
