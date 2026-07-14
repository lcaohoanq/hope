import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Chính sách quyền riêng tư | Hope",
  description: "Cách Hope thu thập, sử dụng, chia sẻ và bảo vệ dữ liệu cá nhân.",
};

const sections: LegalSection[] = [
  {
    id: "pham-vi",
    title: "Phạm vi và vai trò",
    content: (
      <>
        <p>
          Chính sách này áp dụng cho website, ứng dụng và các tính năng mang tên Hope. Chính sách
          giải thích dữ liệu Hope xử lý, lý do xử lý, bên có thể nhận dữ liệu và lựa chọn của bạn.
        </p>
        <p>
          Hope là bên quyết định mục đích xử lý đối với dữ liệu trong sản phẩm. Một số nhà cung cấp
          được nêu bên dưới xử lý dữ liệu theo chỉ dẫn hoặc điều khoản dịch vụ để giúp Hope vận
          hành.
        </p>
      </>
    ),
  },
  {
    id: "du-lieu-thu-thap",
    title: "Dữ liệu chúng tôi thu thập",
    content: (
      <>
        <ul>
          <li>
            <strong>Tài khoản và xác thực:</strong> mã tài khoản, tên người dùng, địa chỉ email,
            trạng thái xác minh, phiên đăng nhập và dữ liệu bảo mật do Clerk xử lý.
          </li>
          <li>
            <strong>Hồ sơ:</strong> tên hiển thị, năm sinh, ảnh đại diện, tiểu sử, vị trí do bạn
            nhập, đại từ xưng hô, ngôn ngữ, website, liên kết mạng xã hội và cài đặt riêng tư.
          </li>
          <li>
            <strong>Hoạt động vận động:</strong> ngày, loại buổi tập, thời gian bắt đầu và kết thúc,
            thời lượng, ghi chú, ảnh và lựa chọn công khai của từng nội dung.
          </li>
          <li>
            <strong>Tương tác xã hội:</strong> lượt theo dõi, yêu cầu theo dõi, trạng thái chấp nhận
            và thông báo liên quan.
          </li>
          <li>
            <strong>Tùy chọn dịch vụ:</strong> giao diện, ngôn ngữ, chế độ xem, tùy chọn nhắc lịch
            và lịch sử gửi email cần thiết.
          </li>
          <li>
            <strong>Dữ liệu kỹ thuật:</strong> địa chỉ IP, loại trình duyệt, thiết bị, thời điểm
            truy cập, cookie phiên và nhật ký lỗi có thể được Hope hoặc nhà cung cấp hạ tầng xử lý
            để bảo mật và vận hành.
          </li>
        </ul>
        <p>
          Hope không yêu cầu giấy tờ tùy thân, dữ liệu sinh trắc học hoặc hồ sơ y tế. Nội dung về
          việc tập luyện có thể tiết lộ thông tin liên quan đến sức khỏe, vì vậy bạn nên cân nhắc kỹ
          trước khi nhập hoặc công khai dữ liệu đó.
        </p>
      </>
    ),
  },
  {
    id: "nguon-du-lieu",
    title: "Nguồn dữ liệu",
    content: (
      <>
        <p>
          Phần lớn dữ liệu đến trực tiếp từ bạn khi đăng ký, hoàn thiện hồ sơ, ghi buổi tập, tải ảnh
          hoặc thay đổi cài đặt. Hope cũng nhận thông tin xác thực cần thiết từ Clerk và tạo dữ liệu
          kỹ thuật khi bạn sử dụng dịch vụ.
        </p>
        <p>
          Nếu người khác đăng nội dung có dữ liệu của bạn, người đó có trách nhiệm bảo đảm có quyền
          phù hợp để chia sẻ. Bạn có thể yêu cầu Hope xem xét nội dung bị cho là xâm phạm quyền
          riêng tư.
        </p>
      </>
    ),
  },
  {
    id: "muc-dich-xu-ly",
    title: "Mục đích và căn cứ xử lý",
    content: (
      <>
        <p>Hope xử lý dữ liệu trong phạm vi cần thiết để:</p>
        <ul>
          <li>Tạo tài khoản, xác thực, duy trì phiên đăng nhập và bảo vệ tài khoản.</li>
          <li>Lưu, hiển thị và đồng bộ hồ sơ, buổi tập, ảnh và cài đặt của bạn.</li>
          <li>Cung cấp tính năng theo dõi, yêu cầu kết nối, thông báo và nhắc lịch.</li>
          <li>
            Phát hiện lỗi, ngăn lạm dụng, bảo vệ người dùng và duy trì độ tin cậy của dịch vụ.
          </li>
          <li>Tuân thủ nghĩa vụ pháp lý và xử lý yêu cầu hợp lệ từ cơ quan có thẩm quyền.</li>
        </ul>
        <p>
          Tùy từng hoạt động và pháp luật áp dụng, căn cứ xử lý có thể là sự đồng ý của bạn, việc
          thực hiện thỏa thuận cung cấp dịch vụ, lợi ích hợp pháp trong bảo mật và cải thiện sản
          phẩm, hoặc nghĩa vụ pháp lý. Khi cần sự đồng ý riêng, Hope sẽ cung cấp thông tin phù hợp
          trước khi xử lý.
        </p>
      </>
    ),
  },
  {
    id: "cong-khai-rieng-tu",
    title: "Nội dung công khai và riêng tư",
    content: (
      <>
        <p>
          Hồ sơ công khai có thể hiển thị tên, tên người dùng, ảnh đại diện, tiểu sử, năm sinh, vị
          trí, liên kết và các buổi tập công khai. Nội dung công khai có thể được xem, sao chép hoặc
          chia sẻ bởi người khác ngoài khả năng kiểm soát của Hope.
        </p>
        <p>
          Khi bật hồ sơ riêng tư, Hope giới hạn thông tin chi tiết và nội dung tập luyện đối với
          người chưa được chấp nhận. Một số thông tin cơ bản như tên, tên người dùng, ảnh đại diện
          và trạng thái riêng tư vẫn có thể xuất hiện để hỗ trợ tìm kiếm và yêu cầu theo dõi.
        </p>
        <p>
          Bạn có thể thay đổi quyền riêng tư của hồ sơ và từng buổi tập trong các cài đặt tương ứng.
          Thay đổi không thể thu hồi bản sao mà người khác đã lưu khi nội dung còn công khai.
        </p>
      </>
    ),
  },
  {
    id: "chia-se-du-lieu",
    title: "Nhà cung cấp và chia sẻ dữ liệu",
    content: (
      <>
        <p>Hope sử dụng các nhà cung cấp sau trong phạm vi cần thiết:</p>
        <ul>
          <li>
            <strong>Clerk:</strong> đăng ký, email, tên người dùng, xác thực và quản lý phiên.
          </li>
          <li>
            <strong>Supabase Postgres:</strong> lưu hồ sơ, buổi tập, quan hệ theo dõi và thông báo.
          </li>
          <li>
            <strong>Appwrite:</strong> chuyển đổi và tối ưu ảnh buổi tập trước khi lưu.
          </li>
          <li>
            <strong>Cloudinary:</strong> lưu trữ và phân phối ảnh đại diện, ảnh buổi tập.
          </li>
          <li>
            <strong>Resend:</strong> gửi email nhắc lịch và email dịch vụ khi tính năng này được
            bật.
          </li>
          <li>
            <strong>Nhà cung cấp triển khai:</strong> vận hành máy chủ, mạng, nhật ký kỹ thuật và
            bảo mật dịch vụ.
          </li>
        </ul>
        <p>
          Hope không bán dữ liệu cá nhân. Hope không chia sẻ dữ liệu cho mục đích quảng cáo theo
          hành vi. Dữ liệu có thể được cung cấp khi bạn yêu cầu, khi cần bảo vệ quyền và an toàn,
          trong giao dịch tổ chức hợp pháp, hoặc khi pháp luật và cơ quan có thẩm quyền yêu cầu.
        </p>
      </>
    ),
  },
  {
    id: "chuyen-du-lieu",
    title: "Chuyển dữ liệu qua biên giới",
    content: (
      <>
        <p>
          Một số nhà cung cấp nêu trên vận hành hạ tầng ở nhiều quốc gia. Vì vậy, dữ liệu có thể
          được lưu trữ hoặc xử lý ngoài quốc gia nơi bạn sinh sống.
        </p>
        <p>
          Khi việc chuyển dữ liệu cá nhân qua biên giới thuộc phạm vi điều chỉnh của pháp luật, Hope
          sẽ áp dụng yêu cầu và biện pháp bảo vệ phù hợp, bao gồm thỏa thuận xử lý dữ liệu, giới hạn
          mục đích và kiểm soát truy cập khi cần thiết.
        </p>
      </>
    ),
  },
  {
    id: "cookie",
    title: "Cookie và công nghệ tương tự",
    content: (
      <>
        <p>
          Hope và Clerk sử dụng cookie hoặc cơ chế lưu trữ tương tự để duy trì đăng nhập, bảo mật
          phiên và ghi nhớ một số cài đặt. Các cookie cần thiết này hỗ trợ chức năng cốt lõi của
          dịch vụ.
        </p>
        <p>
          Phiên bản hiện tại của Hope không tích hợp mạng quảng cáo hoặc công cụ theo dõi quảng cáo
          đa website. Việc chặn cookie cần thiết có thể khiến đăng nhập và một số tính năng không
          hoạt động.
        </p>
      </>
    ),
  },
  {
    id: "luu-tru-xoa",
    title: "Thời gian lưu trữ và xóa dữ liệu",
    content: (
      <>
        <p>
          Hope lưu dữ liệu khi tài khoản còn hoạt động hoặc trong thời gian cần thiết để cung cấp
          dịch vụ, bảo mật hệ thống, giải quyết tranh chấp và thực hiện nghĩa vụ pháp lý. Thời gian
          cụ thể phụ thuộc vào loại dữ liệu và mục đích xử lý.
        </p>
        <p>
          Khi tài khoản hoặc nội dung được xóa hợp lệ, Hope sẽ xóa hoặc khử nhận dạng dữ liệu khỏi
          hệ thống đang hoạt động trong thời gian hợp lý. Bản sao dự phòng, nhật ký bảo mật và dữ
          liệu phải giữ theo pháp luật có thể tồn tại thêm trong thời hạn giới hạn. Ảnh bị thay thế
          hoặc xóa sẽ được yêu cầu gỡ khỏi kho lưu trữ liên quan.
        </p>
      </>
    ),
  },
  {
    id: "bao-mat",
    title: "Bảo mật dữ liệu",
    content: (
      <>
        <p>
          Hope áp dụng biện pháp kỹ thuật và tổ chức phù hợp như kiểm soát truy cập, xác thực, kết
          nối mã hóa, tách khóa bí mật khỏi trình duyệt và giới hạn quyền ghi dữ liệu ở phía máy
          chủ.
        </p>
        <p>
          Không hệ thống nào an toàn tuyệt đối. Bạn nên sử dụng phương thức đăng nhập an toàn, không
          chia sẻ mã xác thực và báo ngay khi phát hiện hoạt động đáng ngờ.
        </p>
      </>
    ),
  },
  {
    id: "quyen-cua-ban",
    title: "Quyền và lựa chọn của bạn",
    content: (
      <>
        <p>Tùy pháp luật áp dụng, bạn có thể có quyền:</p>
        <ul>
          <li>Được biết và truy cập dữ liệu cá nhân Hope đang xử lý về bạn.</li>
          <li>Yêu cầu chỉnh sửa dữ liệu không chính xác hoặc tự cập nhật trong phần cài đặt.</li>
          <li>Rút lại sự đồng ý, phản đối hoặc yêu cầu hạn chế một số hoạt động xử lý.</li>
          <li>
            Yêu cầu xóa dữ liệu, đóng tài khoản hoặc nhận bản sao dữ liệu ở định dạng phù hợp.
          </li>
          <li>
            Khiếu nại tới Hope hoặc cơ quan có thẩm quyền nếu cho rằng quyền của mình bị ảnh hưởng.
          </li>
        </ul>
        <p>
          Hope có thể cần xác minh danh tính trước khi xử lý yêu cầu. Một số yêu cầu có thể bị giới
          hạn khi dữ liệu cần thiết để thực hiện nghĩa vụ pháp lý, bảo vệ quyền của người khác hoặc
          duy trì an toàn hệ thống.
        </p>
      </>
    ),
  },
  {
    id: "tre-em",
    title: "Dữ liệu của trẻ em",
    content: (
      <>
        <p>
          Trẻ em chỉ nên sử dụng Hope với sự đồng ý và giám sát của cha mẹ hoặc người đại diện hợp
          pháp theo pháp luật áp dụng. Người đại diện có thể thay mặt trẻ thực hiện các quyền liên
          quan đến dữ liệu cá nhân.
        </p>
        <p>
          Nếu bạn cho rằng trẻ em đã cung cấp dữ liệu không có sự đồng ý cần thiết, hãy liên hệ qua
          kênh hỗ trợ chính thức để Hope xem xét và thực hiện biện pháp phù hợp.
        </p>
      </>
    ),
  },
  {
    id: "thay-doi-lien-he",
    title: "Thay đổi chính sách và liên hệ",
    content: (
      <>
        <p>
          Hope có thể cập nhật chính sách này khi sản phẩm, nhà cung cấp hoặc yêu cầu pháp lý thay
          đổi. Ngày có hiệu lực ở đầu trang sẽ được cập nhật. Nếu thay đổi ảnh hưởng đáng kể đến
          quyền của bạn, Hope sẽ cố gắng thông báo rõ ràng trước khi áp dụng.
        </p>
        <p>
          “Hope” là tên của dịch vụ; “chúng tôi” là cá nhân hoặc tổ chức trực tiếp vận hành dịch vụ.
          Yêu cầu về dữ liệu cá nhân có thể được gửi qua kênh hỗ trợ chính thức hiển thị trong Hope
          hoặc trong email giao dịch. Hãy gửi yêu cầu từ địa chỉ email gắn với tài khoản để quá
          trình xác minh thuận lợi hơn.
        </p>
        <p>
          Việc sử dụng Hope cũng chịu sự điều chỉnh của{" "}
          <Link href="/terms-of-service">Điều khoản dịch vụ</Link>.
        </p>
      </>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      alternate={{ href: "/terms-of-service", label: "Điều khoản dịch vụ" }}
      description="Chính sách này giải thích dữ liệu Hope sử dụng, lý do xử lý và cách bạn kiểm soát thông tin của mình."
      effectiveDate="14/07/2026"
      sections={sections}
      title="Chính sách quyền riêng tư"
    />
  );
}
