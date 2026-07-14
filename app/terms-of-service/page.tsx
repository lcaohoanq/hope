import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Điều khoản dịch vụ | Hope",
  description: "Các điều khoản áp dụng khi truy cập và sử dụng dịch vụ Hope.",
};

const sections: LegalSection[] = [
  {
    id: "chap-nhan-dieu-khoan",
    title: "Chấp nhận điều khoản",
    content: (
      <>
        <p>
          Khi tạo tài khoản, truy cập hoặc sử dụng Hope, bạn xác nhận rằng bạn đã đọc, hiểu và đồng
          ý với các điều khoản này cùng với{" "}
          <Link href="/privacy-policy">Chính sách quyền riêng tư</Link>.
        </p>
        <p>
          Nếu bạn sử dụng Hope thay mặt cho một tổ chức, bạn xác nhận mình có thẩm quyền chấp nhận
          các điều khoản này thay mặt tổ chức đó.
        </p>
      </>
    ),
  },
  {
    id: "dich-vu-hope",
    title: "Dịch vụ Hope",
    content: (
      <>
        <p>
          Hope là công cụ ghi lại quá trình vận động. Dịch vụ cho phép bạn tạo hồ sơ, lưu buổi tập,
          đăng ảnh, theo dõi thói quen và tương tác với những người dùng khác.
        </p>
        <p>
          Hope không phải là dịch vụ y tế và không cung cấp chẩn đoán, điều trị hay lời khuyên y
          khoa. Hãy tham khảo chuyên gia có chuyên môn trước khi thay đổi chế độ tập luyện, đặc biệt
          nếu bạn có bệnh nền hoặc dấu hiệu bất thường.
        </p>
      </>
    ),
  },
  {
    id: "tai-khoan",
    title: "Tài khoản và điều kiện sử dụng",
    content: (
      <>
        <ul>
          <li>Bạn phải cung cấp thông tin chính xác và cập nhật khi thông tin thay đổi.</li>
          <li>
            Bạn chịu trách nhiệm bảo vệ phương thức đăng nhập và mọi hoạt động diễn ra trong tài
            khoản của mình.
          </li>
          <li>
            Không chia sẻ, chuyển nhượng hoặc cho thuê tài khoản nếu chưa có chấp thuận của Hope.
          </li>
          <li>
            Nếu bạn là trẻ em theo pháp luật áp dụng, việc sử dụng phải có sự đồng ý và giám sát của
            cha mẹ hoặc người đại diện hợp pháp.
          </li>
        </ul>
        <p>
          Hãy thông báo ngay qua kênh hỗ trợ chính thức nếu bạn cho rằng tài khoản đã bị truy cập
          trái phép.
        </p>
      </>
    ),
  },
  {
    id: "noi-dung-nguoi-dung",
    title: "Nội dung của bạn",
    content: (
      <>
        <p>
          Bạn giữ quyền sở hữu đối với ghi chú, hình ảnh, thông tin hồ sơ và nội dung khác mà bạn
          đăng lên Hope. Bạn chỉ cấp cho Hope quyền không độc quyền, có phạm vi cần thiết để lưu
          trữ, xử lý, sao lưu, hiển thị và truyền nội dung nhằm vận hành dịch vụ theo cài đặt riêng
          tư của bạn.
        </p>
        <p>
          Bạn xác nhận mình có quyền đăng nội dung đó và nội dung không xâm phạm quyền riêng tư,
          quyền sở hữu trí tuệ hoặc quyền hợp pháp của người khác. Không đăng giấy tờ tùy thân, dữ
          liệu sức khỏe nhạy cảm hoặc hình ảnh của người khác khi chưa có căn cứ phù hợp.
        </p>
      </>
    ),
  },
  {
    id: "quyen-rieng-tu",
    title: "Hiển thị và quyền riêng tư",
    content: (
      <>
        <p>
          Hồ sơ, buổi tập hoặc ảnh được đặt ở chế độ công khai có thể được người khác xem và chia sẻ
          ngoài Hope. Khi chuyển hồ sơ sang riêng tư, một số thông tin cơ bản vẫn có thể xuất hiện
          để nhận diện tài khoản và xử lý yêu cầu theo dõi.
        </p>
        <p>
          Bạn có trách nhiệm xem lại cài đặt hiển thị trước khi đăng nội dung. Cách Hope thu thập và
          xử lý dữ liệu cá nhân được mô tả chi tiết trong{" "}
          <Link href="/privacy-policy">Chính sách quyền riêng tư</Link>.
        </p>
      </>
    ),
  },
  {
    id: "hanh-vi-bi-cam",
    title: "Hành vi không được phép",
    content: (
      <>
        <p>Bạn không được sử dụng Hope để:</p>
        <ul>
          <li>Vi phạm pháp luật, quyền của người khác hoặc các nghĩa vụ mà bạn đã cam kết.</li>
          <li>Quấy rối, đe dọa, mạo danh, lừa đảo hoặc phát tán nội dung gây hại.</li>
          <li>Đăng mã độc, cố truy cập trái phép, dò quét hoặc làm gián đoạn hệ thống.</li>
          <li>Thu thập dữ liệu của người dùng khác bằng phương thức tự động khi chưa được phép.</li>
          <li>
            Sử dụng dịch vụ để quảng cáo rác, mua bán dữ liệu cá nhân hoặc tạo tài khoản giả hàng
            loạt.
          </li>
        </ul>
        <p>
          Hope có thể gỡ nội dung, giới hạn tính năng hoặc đình chỉ tài khoản khi cần thiết để bảo
          vệ người dùng, hệ thống hoặc tuân thủ pháp luật.
        </p>
      </>
    ),
  },
  {
    id: "dich-vu-ben-thu-ba",
    title: "Dịch vụ bên thứ ba",
    content: (
      <>
        <p>
          Hope sử dụng một số nhà cung cấp hạ tầng để xác thực tài khoản, lưu dữ liệu, xử lý hình
          ảnh và gửi email. Các nhà cung cấp này có điều khoản riêng và có thể xử lý dữ liệu trong
          phạm vi cần thiết để cung cấp dịch vụ cho Hope.
        </p>
        <p>
          Liên kết đến website hoặc dịch vụ khác không có nghĩa Hope kiểm soát hay chịu trách nhiệm
          cho nội dung và hoạt động của bên đó.
        </p>
      </>
    ),
  },
  {
    id: "thay-doi-tam-ngung",
    title: "Thay đổi, tạm ngừng và chấm dứt",
    content: (
      <>
        <p>
          Hope có thể sửa đổi, bổ sung hoặc ngừng một phần dịch vụ để cải thiện sản phẩm, bảo đảm an
          toàn hoặc đáp ứng yêu cầu pháp lý. Khi thay đổi ảnh hưởng đáng kể đến quyền của bạn, Hope
          sẽ cố gắng thông báo trước bằng phương thức phù hợp.
        </p>
        <p>
          Bạn có thể ngừng sử dụng dịch vụ bất cứ lúc nào. Việc chấm dứt tài khoản không làm mất
          hiệu lực các nghĩa vụ vốn cần tiếp tục áp dụng, như quyền sở hữu nội dung, giới hạn trách
          nhiệm và giải quyết tranh chấp.
        </p>
      </>
    ),
  },
  {
    id: "tuyen-bo-bao-dam",
    title: "Tính sẵn sàng và giới hạn trách nhiệm",
    content: (
      <>
        <p>
          Hope được cung cấp trên cơ sở hiện trạng và có thể có thời điểm gián đoạn, lỗi hoặc mất
          tính năng. Hope sẽ áp dụng biện pháp hợp lý để duy trì dịch vụ nhưng không cam kết dịch vụ
          luôn liên tục hoặc không có lỗi.
        </p>
        <p>
          Trong phạm vi pháp luật cho phép, Hope không chịu trách nhiệm cho thiệt hại gián tiếp hoặc
          phát sinh từ việc bạn dựa vào dữ liệu tập luyện, nội dung do người dùng đăng, dịch vụ bên
          thứ ba hoặc sự kiện ngoài khả năng kiểm soát hợp lý. Không nội dung nào trong điều khoản
          này loại trừ trách nhiệm không được phép loại trừ theo pháp luật.
        </p>
      </>
    ),
  },
  {
    id: "phap-luat-lien-he",
    title: "Pháp luật áp dụng và liên hệ",
    content: (
      <>
        <p>
          Các điều khoản này được giải thích theo pháp luật Việt Nam. Hai bên sẽ ưu tiên giải quyết
          bất đồng bằng trao đổi thiện chí trước khi sử dụng cơ chế giải quyết tranh chấp theo pháp
          luật có thẩm quyền.
        </p>
        <p>
          “Hope” là tên của dịch vụ; “chúng tôi” là cá nhân hoặc tổ chức trực tiếp vận hành dịch vụ.
          Câu hỏi về điều khoản có thể được gửi qua kênh hỗ trợ chính thức hiển thị trong Hope hoặc
          trong email giao dịch của dịch vụ.
        </p>
      </>
    ),
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalPage
      alternate={{ href: "/privacy-policy", label: "Chính sách quyền riêng tư" }}
      description="Những quy tắc giúp Hope duy trì một không gian ghi lại vận động an toàn, rõ ràng và tôn trọng người dùng."
      effectiveDate="14/07/2026"
      sections={sections}
      title="Điều khoản dịch vụ"
    />
  );
}
